import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { PlanDuTrade } from "@/components/cours/outils/PlanDuTrade";
import { GrilleGagnants } from "@/components/cours/outils/GrilleGagnants";
import { SeriePertes } from "@/components/cours/outils/SeriePertes";

// L'euro-dollar : une hausse, un repli jusqu'à 1,0985 (le dernier creux), on achète à 1,1000.
// La suite redescend à 1,0990 (un stop trop serré saute), puis monte au-delà de 1,1040.
const euro = serie([[0, 1.0900], [8, 1.0950], [13, 1.0928, "bas"], [22, 1.1040, "haut"], [30, 1.1008], [36, 1.0985, "bas"], [44, 1.1000], [49, 1.0990, "bas"], [57, 1.1046, "haut"], [63, 1.1036]], { graine: 9, bruit: 0.0007 });
// L'or, pour l'exercice : creux à 3 965, achat à 4 000, dernier sommet à 4 080.
const or = serie([[0, 3900], [8, 3955], [13, 3938, "bas"], [24, 4080, "haut"], [31, 4012], [38, 3965, "bas"], [46, 4000], [52, 3972, "bas"], [60, 4030], [69, 4092, "haut"], [75, 4076]], { graine: 71, bruit: 0.003 });

const ENTREE = { prix: 1.1, label: "Entrée 1,1000", couleur: "var(--cap-ink)", pointille: false };
const STOP = { prix: 1.098, label: "Stop loss 1,0980", couleur: "var(--cap-down)", pointille: false, epaisseur: 2 };
const TP = { prix: 1.104, label: "Take profit 1,1040", couleur: "var(--cap-up)", pointille: false, epaisseur: 2 };

const lecon: LeconSerie = {
  numero: 7,
  accroche: "Combien pouvez-vous perdre sur ce trade ? Un professionnel le sait avant d'entrer.",
  promesse: "À la fin de cette leçon, vous saurez placer un stop loss et un take profit, lire un ratio risque / rendement, et choisir la part de votre capital à risquer sur chaque trade.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Décider à l'avance ce qu'on accepte de perdre" },
      { t: "p", html: "Personne ne sait où ira le prix. Le meilleur trader du monde se trompe souvent. Ce qui le distingue d'un débutant, ce n'est pas d'avoir raison plus souvent : c'est de savoir, <b>avant d'entrer</b>, combien il perdra s'il a tort. C'est ce qu'on appelle <span class=\"mot\">gérer son risque</span> (en anglais, <em>risk management</em>)." },
      { t: "p", html: "Concrètement, avant chaque trade, vous répondez à trois questions : <b>où je sors si je me trompe</b>, <b>où je sors si j'ai raison</b>, et <b>combien d'argent je mets en jeu</b>. Les trois réponses ont un nom : le stop loss, le take profit, et le risque par trade." },

      { t: "h", texte: "Le stop loss, la sortie de secours" },
      { t: "p", html: "Le <span class=\"mot\">stop loss</span> (souvent dit « stop ») est <b>un ordre qui ferme votre position tout seul</b> si le prix va contre vous. Vous le posez au moment d'entrer, à un prix précis. Si le prix l'atteint, la plateforme vend pour vous, même si vous dormez, même si vous hésitez. La perte s'arrête là où vous l'aviez décidé." },
      { t: "p", html: "Sans stop, rien n'arrête une perte : ni le prix, ni la plateforme. Il ne reste que votre volonté de fermer, au pire moment, quand la perte fait mal et qu'on espère un retour. C'est l'erreur la plus chère des débutants (leçon 20)." },

      { t: "h", texte: "Où le placer : là où votre idée devient fausse" },
      { t: "p", html: "Un stop ne se place pas au hasard, ni à « 20 $ parce que c'est rond ». Il se place <b>là où votre raison d'entrer n'existe plus</b>. Les traders appellent ce point l'<span class=\"mot\">invalidation</span>. Vous achetez parce que le prix monte en faisant des creux de plus en plus hauts ? Si le prix repasse sous le dernier creux, cette hausse est cassée : votre idée est fausse. Le stop va donc <b>juste sous le dernier creux</b>." },
      {
        t: "scenes",
        titre: "Construire un plan, pièce par pièce",
        scenes: [
          { legende: "L'euro-dollar monte. Il vient de se replier, puis de repartir : vous achetez à <b>1,1000</b>.", cfg: { bougies: euro, jusqua: 44, marques: [{ i: 44, type: "achat", label: "Achat" }], niveaux: [ENTREE], unite: "heure" } },
          { legende: "Le dernier creux, à <b>1,0985</b> : tant que le prix reste au-dessus, la hausse tient.", cfg: { bougies: euro, jusqua: 44, marques: [{ i: 44, type: "achat", label: "Achat" }, { i: 36, type: "point" }], niveaux: [ENTREE], notes: [{ i: 36, prix: 1.0985, texte: "Dernier creux", dessous: true }], unite: "heure" } },
          { legende: "Le <b>stop loss</b>, juste sous ce creux, à 1,0980 : 20 pips sous l'entrée. S'il est touché, votre idée était fausse.", cfg: { bougies: euro, jusqua: 44, marques: [{ i: 44, type: "achat", label: "Achat" }, { i: 36, type: "point" }], niveaux: [ENTREE, STOP], unite: "heure" } },
          { legende: "Le <b>take profit</b>, au dernier sommet, à 1,1040 : 40 pips au-dessus. Vous risquez 20 pips pour en viser 40.", cfg: { bougies: euro, jusqua: 44, marques: [{ i: 44, type: "achat", label: "Achat" }, { i: 22, type: "point", prix: 1.104 }], niveaux: [ENTREE, STOP, TP], unite: "heure" } },
          { legende: "En rouge, ce que vous acceptez de perdre ; en vert, ce que vous visez. La zone verte est deux fois plus haute : un ratio de <b>1 pour 2</b>.", cfg: { bougies: euro, jusqua: 44, niveaux: [ENTREE, STOP, TP], zones: [{ i0: 44, i1: 63, p0: 1.098, p1: 1.1, couleur: "var(--cap-down)" }, { i0: 44, i1: 63, p0: 1.1, p1: 1.104, couleur: "var(--cap-up)" }], unite: "heure" } },
          { legende: "La suite : le prix respire jusqu'à 1,0990, sans toucher le stop, puis atteint l'objectif. Ici, ça a marché. Rien ne le garantissait : c'est pour ça que le stop était là.", cfg: { bougies: euro, niveaux: [ENTREE, STOP, TP], zones: [{ i0: 44, i1: 63, p0: 1.098, p1: 1.1, couleur: "var(--cap-down)" }, { i0: 44, i1: 63, p0: 1.1, p1: 1.104, couleur: "var(--cap-up)" }], marques: [{ i: 57, type: "point", prix: 1.104 }], unite: "heure" } },
        ],
      },
      { t: "p", html: "Laissez toujours <b>un peu de marge</b> sous le creux : quelques pips. Le prix revient souvent tester un creux du bout d'une mèche, et beaucoup de traders posent leur stop exactement dessus. Un stop collé au creux, ou au-dessus, saute pour rien." },
      {
        t: "graphique",
        cfg: { bougies: euro, niveaux: [ENTREE, { prix: 1.0995, label: "Stop trop serré 1,0995", couleur: "var(--cap-down)", pointille: false, epaisseur: 2 }], marques: [{ i: 45, type: "croix", prix: 1.0995 }], surligne: [45], unite: "heure" },
        legende: "Le même trade avec un stop à 1,0995, au-dessus du creux. Une simple respiration du prix le touche : perte, puis la hausse repart sans vous. Le stop doit être là où l'idée est fausse, pas là où il fait le moins peur.",
      },

      { t: "h", texte: "Le take profit, l'objectif" },
      { t: "p", html: "En face du stop, le <span class=\"mot\">take profit</span> (« prendre le bénéfice ») est un ordre qui <b>encaisse le gain</b> quand le prix atteint votre objectif. Lui aussi se pose à l'avance, à un endroit qui a un sens : le dernier sommet, une résistance (leçon 33), un niveau où le prix a déjà calé. Pas « là où je serais content »." },
      { t: "p", html: "Il vous protège d'un autre piège : regarder un gain fondre en espérant toujours plus. Quand l'objectif est atteint, la position se ferme, sans discussion." },

      { t: "h", texte: "Le ratio risque / rendement" },
      { t: "p", html: "Le <span class=\"mot\">ratio risque / rendement</span> (en anglais <em>risk/reward ratio</em>, écrit R:R) compare ce que vous risquez à ce que vous visez. Risquer 20 $ pour en viser 40, c'est <b>1 pour 2</b> ; risquer 20 $ pour en viser 60, c'est 1 pour 3." },
      {
        t: "exemple",
        html: "Sur l'euro-dollar, vous achetez à <b>1,1000</b>. Le stop est à 1,0980 : <b>20 pips</b> de risque. L'objectif est à 1,1040 : <b>40 pips</b> visés. 40 ÷ 20 = 2 : le ratio est de <b>1 pour 2</b>. Avec 0,10 lot, un pip vaut 1 $ : vous risquez 20 $ pour en viser 40 $.",
      },
      { t: "p", html: "Pourquoi c'est si important ? Parce qu'avec un ratio de 1 pour 2, <b>un seul gain compense deux pertes</b>. Vous n'avez pas besoin d'avoir raison à chaque fois, ni même une fois sur deux." },
      {
        t: "tableau",
        entetes: ["Ratio", "Un gain compense…", "Gagnants sur 100 pour ne pas perdre"],
        lignes: [
          ["1 pour 1", "une perte", "50"],
          ["1 pour 1,5", "une perte et demie", "40"],
          ["1 pour 2", "deux pertes", "34 (le point mort est à 33,3)"],
          ["1 pour 3", "trois pertes", "25"],
        ],
        legende: "Frais non compris. Le calcul : avec un ratio de 1 pour X, le point mort est à 100 ÷ (1 + X) gagnants sur 100.",
      },
      {
        t: "outil",
        titre: "Combien de gagnants sur 100 ?",
        consigne: "Choisissez un ratio, devinez le plus petit nombre de trades gagnants qui ne fait pas perdre d'argent, puis vérifiez.",
        el: <GrilleGagnants risque={20} />,
      },
      { t: "piege", html: "<b>Viser très loin pour avoir un beau ratio.</b> Un objectif à 1 pour 10 a l'air formidable sur le papier, mais le prix l'atteindra rarement : vous gagnerez beaucoup moins souvent. Le ratio n'a de sens que si l'objectif est <b>réaliste</b>, posé sur un vrai niveau. Un 1 pour 2 atteint de temps en temps vaut mieux qu'un 1 pour 10 jamais atteint." },
      {
        t: "outil",
        titre: "Posez votre plan sur l'or",
        consigne: "Vous achetez l'or à 4 000 $. Choisissez « Le stop » et touchez le graphique là où vous le placeriez, puis faites de même pour l'objectif. Les écarts se lisent en dollars de prix. Puis faites avancer le temps.",
        el: <PlanDuTrade bougies={or} entree={46} creux={3965} proposition={{ stop: 3960, objectif: 4080 }} />,
      },

      { t: "h", texte: "Une petite part du capital par trade : souvent 1 %" },
      { t: "p", html: "Reste la troisième question : combien d'argent mettre en jeu. La règle des professionnels tient en une ligne : <b>ne risquer qu'une petite part de son capital sur chaque trade</b>, souvent <b>1 %</b>. C'est le <span class=\"mot\">risque par trade</span> : ce que vous perdez si le stop est touché." },
      {
        t: "exemple",
        html: "Votre compte : <b>2 000 $</b>. 1 % de 2 000 $, c'est <b>20 $</b>. Sur chaque trade, si le stop est touché, vous perdez 20 $, pas plus. Le stop à 20 pips de l'exemple, avec 0,10 lot sur l'euro-dollar, coûte justement 20 $. Le calcul de la taille qui tombe juste, quel que soit le stop, est le sujet de la leçon 19.",
      },
      { t: "p", html: "Pourquoi si peu ? Parce que les pertes arrivent <b>en série</b>, et qu'elles arrivent à tout le monde. Dix pertes de suite ne sont pas rares sur une année. À 1 % par trade, elles coûtent environ 10 % du compte : on s'en remet. À 10 % par trade, elles en emportent les deux tiers." },
      {
        t: "outil",
        titre: "Dix pertes de suite",
        consigne: "Faites perdre le compte de 2 000 $, une perte après l'autre. Comparez 1 % par trade à un risque plus gros, et regardez surtout la dernière ligne : ce qu'il faudrait gagner ensuite pour revenir.",
        el: <SeriePertes capital={2000} />,
      },
      { t: "p", html: "La dernière ligne est la plus cruelle. Après une perte de 50 %, il ne faut pas gagner 50 % pour revenir, mais <b>100 %</b> : la moitié restante doit doubler. Plus la chute est profonde, plus la remontée est longue. Risquer peu, c'est d'abord <b>rester dans la partie</b>." },

      {
        t: "qr", items: [
          { q: "Mon stop a été touché, puis le prix est reparti dans mon sens. J'aurais dû ne pas en mettre ?", r: "Ça arrive, et c'est frustrant. Mais regardez l'autre cas : le prix qui ne revient jamais. Le stop coûte parfois un trade qui aurait fini en gain ; son absence peut coûter le compte. Si cela vous arrive souvent, demandez-vous plutôt si votre stop était vraiment sous le creux, avec un peu de marge." },
          { q: "Puis-je déplacer mon stop une fois dans le trade ?", r: "Le rapprocher, oui : par exemple le remonter sous un nouveau creux quand le prix monte, pour protéger une partie du gain. L'éloigner, jamais : vous augmenteriez votre risque sans l'avoir décidé à froid (leçon 20)." },
          { q: "Un take profit est-il obligatoire ?", r: "Moins que le stop. Certains traders sortent autrement (sur un signal, ou en suivant la tendance). Mais pour débuter, un objectif posé à l'avance vous oblige à calculer votre ratio, et vous évite de rendre un gain au marché." },
          { q: "Pourquoi 1 % et pas 5 % ?", r: "Parce qu'à 5 %, dix pertes de suite emportent environ 40 % du compte, et qu'il faut ensuite près de 70 % de gain pour revenir. 1 % n'est pas une loi : certains prennent 0,5 %, d'autres 2 %. Au-delà, une mauvaise série devient très difficile à rattraper." },
        ],
      },
      { t: "nimbo", texte: "Sur la page Ma stratégie, quand vous réglez l'objectif en multiple du risque, je vous dis combien de fois sur 100 il faudra avoir raison pour ne pas perdre. Et sur la page Trading, une fois votre stop posé, la taille se calcule d'après le risque que vous avez choisi.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Gestion du risque", en: "risk management", def: "Décider à l'avance combien on accepte de perdre, et s'y tenir." },
    { terme: "Stop loss", en: "stop loss", def: "Un ordre qui ferme la position tout seul si le prix va contre vous, à un prix fixé à l'avance." },
    { terme: "Invalidation", en: "invalidation", def: "Le prix où votre raison d'entrer n'existe plus : c'est là que va le stop, par exemple sous le dernier creux." },
    { terme: "Take profit", en: "take profit", def: "Un ordre qui encaisse le gain quand le prix atteint votre objectif." },
    { terme: "Ratio risque / rendement", en: "risk/reward ratio, R:R", def: "Ce que vous visez comparé à ce que vous risquez : 20 $ risqués pour 40 $ visés, c'est 1 pour 2." },
    { terme: "Risque par trade", en: "risk per trade", def: "La part du capital perdue si le stop est touché : souvent 1 %, soit 20 $ sur 2 000 $." },
  ],
  retenir: [
    "Gérer son risque, c'est savoir <b>avant d'entrer</b> combien on perd si l'on a tort.",
    "Le <b>stop loss</b> ferme la position tout seul. Il se place là où l'idée devient fausse, par exemple <b>juste sous le dernier creux</b>.",
    "Le <b>take profit</b> encaisse le gain à un objectif réaliste, posé sur un vrai niveau.",
    "Le <b>ratio risque / rendement</b> compare les deux : avec 1 pour 2, <b>un gain compense deux pertes</b>, et 34 gagnants sur 100 suffisent pour ne pas perdre.",
    "Ne risquez qu'une petite part du capital par trade, souvent <b>1 %</b> : 20 $ sur 2 000 $.",
    "Dix pertes de suite à 1 % coûtent environ <b>10 %</b> ; à 10 %, près des <b>deux tiers</b> du compte.",
  ],
  quiz: [
    { question: "Vous achetez dans une hausse. Où placer le stop loss ?", options: ["Juste sous le dernier creux, avec un peu de marge", "Juste sous votre prix d'achat, pour perdre le moins possible", "Nulle part : vous fermerez à la main"], correct: 0, explanation: "Sous le dernier creux, votre idée devient fausse : c'est l'invalidation. Collé à l'entrée, le stop sauterait à la moindre respiration du prix." },
    { question: "Vous risquez 20 $ pour viser 60 $. Quel est le ratio ?", options: ["1 pour 2", "1 pour 3", "3 pour 1"], correct: 1, explanation: "60 ÷ 20 = 3 : vous visez trois fois ce que vous risquez. Un seul gain compense trois pertes." },
    { question: "Avec un ratio de 1 pour 2, combien de gagnants sur 100 faut-il au minimum pour ne pas perdre d'argent ?", options: ["50", "34", "20"], correct: 1, explanation: "Le point mort est à 100 ÷ 3, soit 33,3. Avec 34 gagnants : 34 × 2 = 68 risques gagnés, 66 perdus. Frais non compris." },
    { question: "Votre compte fait 2 000 $ et vous risquez 1 % par trade. Combien perdez-vous si le stop est touché ?", options: ["2 $", "20 $", "200 $"], correct: 1, explanation: "1 % de 2 000 $, c'est 20 $. 200 $, ce serait 10 % du compte en un seul trade." },
    { question: "Pourquoi risquer seulement 1 % par trade ?", options: ["Parce que les pertes arrivent en série, et qu'il faut pouvoir les encaisser", "Parce qu'on gagne plus souvent avec une petite mise", "Parce que c'est obligatoire"], correct: 0, explanation: "La taille ne change pas la probabilité de gagner. Elle change ce que coûte une mauvaise série : dix pertes à 1 % coûtent environ 10 %, à 10 % environ 65 %." },
  ],
  pratique: [
    { texte: "Réglez l'objectif en multiple du risque et lisez combien de fois il faudra avoir raison.", href: "/strategie", bouton: "Ouvrir Ma stratégie" },
    { texte: "Prenez une position fictive avec un stop sous le dernier creux et un take profit sur le dernier sommet.", href: "/trading", bouton: "Prendre position" },
  ],
};

export default lecon;
