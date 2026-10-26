import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { RejeuBacktest } from "@/components/cours/outils/RejeuBacktest";
import { CourbeCapital } from "@/components/cours/outils/CourbeCapital";

// Le rejeu : l'euro-dollar autour d'une zone de support, 1,0950 à 1,0960.
const rejeu = serie([[0, 1.1020], [5, 1.0990], [9, 1.0953, "bas"], [13, 1.0985], [17, 1.1012], [22, 1.1030], [27, 1.0992], [31, 1.0956, "bas"], [32, 1.0964], [35, 1.0936, "bas"], [38, 1.0925], [41, 1.0940], [45, 1.0985], [49, 1.1010], [53, 1.0990], [57, 1.0956, "bas"], [58, 1.0965], [61, 1.0942], [63, 1.0930, "bas"], [66, 1.0950], [69, 1.0990], [72, 1.1015], [76, 1.0985], [80, 1.0955, "bas"], [81, 1.0966], [85, 1.0995], [88, 1.1015], [92, 1.1000]], { graine: 261, bruit: 0.0007, meche: 0.7 });

// Les scènes de la méthode : un setup sur support, la suite cachée, puis révélée.
const methode = serie([[0, 1.1040], [6, 1.1010], [10, 1.0982, "bas"], [14, 1.1005], [18, 1.1025], [22, 1.1000], [26, 1.0981, "bas"], [27, 1.0990], [30, 1.1012], [33, 1.1032, "haut"], [37, 1.1015], [40, 1.1028]], { graine: 262, bruit: 0.0006, meche: 0.7 });
const e1 = methode[27].c;

// Une période calme, puis une période agitée : la même règle n'y vit pas la même chose.
const calme = serie([[0, 1.1000], [10, 1.1015], [20, 1.0995], [30, 1.1010], [40, 1.1000]], { graine: 263, bruit: 0.0005, meche: 0.6 });
const agite = serie([[0, 1.1000], [5, 1.1060], [10, 1.0950], [15, 1.1040], [20, 1.0930], [25, 1.1010], [30, 1.0900], [35, 1.0990], [39, 1.0960]], { graine: 264, bruit: 0.0022, meche: 0.9 });
const periodes = [...calme, ...agite.slice(1)];

const V = "var(--cap-up)", R = "var(--cap-down)";

const lecon: LeconSerie = {
  numero: 26,
  accroche: "Votre idée de trading, elle marche vraiment ? Avant d'y mettre votre argent, vous pouvez la tester sur le passé.",
  promesse: "À la fin de cette leçon, vous saurez faire un backtest honnête, étape par étape : des règles écrites avant, le passé rejoué bougie par bougie, au moins cinquante positions, frais compris. Et vous saurez lire son résultat sans vous raconter d'histoires.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Un backtest, c'est quoi ?" },
      { t: "p", html: "Un <span class=\"mot\">backtest</span> (de l'anglais <em>back</em>, en arrière, et <em>test</em>), c'est <b>rejouer votre plan sur d'anciens graphiques</b>, comme si vous tradiez à l'époque, puis regarder le résultat. Vous avez une idée, par exemple « acheter quand le prix rebondit sur un support » ; avant d'y mettre un euro, vous regardez ce qu'elle aurait donné sur les mois ou les années passés." },
      { t: "p", html: "C'est l'étape qui sépare une intuition d'une méthode. Sans backtest, vous découvrez si votre idée tient la route avec votre argent. Avec, vous le découvrez avec du temps, gratuitement. Le backtest se fait en quatre étapes." },
      { t: "h", texte: "1. Écrire les règles, avant de regarder" },
      { t: "p", html: "Avant d'ouvrir le moindre graphique, vous écrivez vos règles, aussi précises qu'une recette (c'est votre plan de trading, leçon 24) :" },
      {
        t: "liste", items: [
          "<b>le setup</b> : la situation exacte qui vous fait entrer (« une bougie touche la zone de support et clôture au-dessus ») ;",
          "<b>le stop</b> : où vous sortez si vous avez tort (« 20 pips sous l'entrée ») ;",
          "<b>la sortie</b> : où vous prenez votre gain (« 40 pips au-dessus ») ;",
          "<b>le risque</b> : combien vous risquez par position (« 1 % du compte, 20 $ sur 2 000 $, soit 0,10 lot sur l'euro-dollar avec un stop de 20 pips »).",
        ],
      },
      { t: "p", html: "Pourquoi avant ? Parce qu'après coup, devant un graphique dont on connaît la fin, <b>on voit ce qui arrange</b>. Le cerveau trouve toujours une raison de compter le trade gagnant et d'oublier le perdant. Une règle écrite d'avance ne se discute pas." },
      { t: "h", texte: "2. Reculer, cacher la suite, avancer bougie par bougie" },
      { t: "p", html: "Ensuite, vous reculez loin dans le passé, et vous <b>cachez tout ce qui vient après</b>. Puis vous avancez <b>une bougie à la fois</b>, comme en direct : à chaque bougie, vous vous demandez si vos règles disent d'entrer. Beaucoup de plateformes savent le faire : c'est le mode <span class=\"mot\">replay</span> (en anglais <em>bar replay</em>, le rejeu des bougies)." },
      {
        t: "scenes",
        titre: "Le passé, rejoué comme en direct",
        scenes: [
          { legende: "Vous reculez dans le passé. La suite est cachée : vous ne savez pas ce qui vient.", cfg: { bougies: methode, jusqua: 8, unite: "heure", niveaux: [{ prix: 1.0983, zone: 0.0008, label: "Zone de support", couleur: V }] } },
          { legende: "Vous avancez bougie par bougie. Le prix touche la zone, puis repart.", cfg: { bougies: methode, jusqua: 18, unite: "heure", niveaux: [{ prix: 1.0983, zone: 0.0008, label: "Zone de support", couleur: V }] } },
          { legende: "Il revient sur la zone, et une bougie clôture au-dessus : <b>c'est le setup</b>. Vous achetez, avec le stop et la sortie prévus.", cfg: { bougies: methode, jusqua: 27, unite: "heure", niveaux: [{ prix: 1.0983, zone: 0.0008, label: "Zone de support", couleur: V }, { prix: e1 + 0.0040, label: "Sortie +40 pips", couleur: V, pointille: false, epaisseur: 1.2 }, { prix: e1 - 0.0020, label: "Stop −20 pips", couleur: R, pointille: false, epaisseur: 1.2 }], marques: [{ i: 27, type: "achat", prix: e1 }] } },
          { legende: "Vous continuez d'avancer, sans toucher à rien : la sortie est atteinte. Vous notez <b>+40 pips</b> dans le tableau, moins les frais.", cfg: { bougies: methode, jusqua: 33, unite: "heure", niveaux: [{ prix: 1.0983, zone: 0.0008, label: "Zone de support", couleur: V }, { prix: e1 + 0.0040, label: "Sortie +40 pips", couleur: V, pointille: false, epaisseur: 1.2 }, { prix: e1 - 0.0020, label: "Stop −20 pips", couleur: R, pointille: false, epaisseur: 1.2 }], marques: [{ i: 27, type: "achat", prix: e1 }, { i: 33, type: "point", prix: e1 + 0.0040 }] } },
        ],
      },
      { t: "h", texte: "3. Tout noter, frais compris" },
      { t: "p", html: "À chaque setup, vous notez dans un tableau : l'entrée, le stop, la sortie, et le résultat. <b>Frais compris</b> : le spread et la commission (leçons 16 et 21) se paient sur chaque position, gagnante ou perdante. Un backtest sans frais ment toujours dans le même sens : il embellit." },
      {
        t: "tableau",
        entetes: ["N°", "Entrée", "Stop", "Sortie", "Résultat", "Frais", "Net"],
        lignes: [
          ["1", "1,0990", "1,0970", "1,1030 (objectif)", "+40 $", "−1 $", "+39 $"],
          ["2", "1,0987", "1,0967", "1,0967 (stop)", "−20 $", "−1 $", "−21 $"],
          ["3", "1,0992", "1,0972", "1,0972 (stop)", "−20 $", "−1 $", "−21 $"],
        ],
        legende: "Un tableau de backtest : une ligne par position, sans exception. À 0,10 lot sur l'euro-dollar, 1 pip vaut 1 $.",
      },
      {
        t: "outil",
        titre: "Votre premier backtest",
        consigne: "Les règles sont écrites au-dessus du graphique. Avancez bougie par bougie ; quand une bougie remplit la règle d'entrée, achetez. Le stop et l'objectif font le reste. Vous pouvez soulever le masque pour voir la suite… essayez de ne pas le faire.",
        el: <RejeuBacktest bougies={rejeu} zoneBas={1.0950} zoneHaut={1.0960} />,
      },
      { t: "h", texte: "4. Assez de positions" },
      { t: "p", html: "Combien de positions faut-il ? <b>Pas trois.</b> Avec trois positions, un coup de chance ressemble à une bonne méthode : trois gains d'affilée, ça arrive même avec une idée sans valeur, comme trois « pile » d'affilée avec une pièce. C'est la question de la <span class=\"mot\">taille de l'échantillon</span> (<em>sample size</em>) : plus il y a de positions, moins le hasard pèse sur le résultat." },
      { t: "p", html: "Visez <b>au moins cinquante positions</b>, et prenez-les <b>sur des périodes calmes et des périodes agitées</b>. Une règle qui marche quand le marché dort peut se faire déchirer quand il s'agite, et l'inverse." },
      {
        t: "graphique",
        cfg: { bougies: periodes, unite: "heure", zones: [{ i0: 0, i1: 40, p0: 1.0985, p1: 1.1025, couleur: "var(--cap-ocean)", label: "Calme" }, { i0: 41, i1: periodes.length - 1, p0: 1.0890, p1: 1.1070, couleur: "var(--cap-amber-ink)", label: "Agité" }] },
        legende: "Le même euro-dollar, deux humeurs. Dans la période calme, un stop de 20 pips est rarement touché par hasard ; dans la période agitée, il saute à chaque mèche. Un backtest honnête traverse les deux.",
      },
      {
        t: "exemple",
        titre: "L'exemple : cinquante positions",
        html: "Une idée, testée sur <b>50 positions</b> : 17 gains de 40 $ et 33 pertes de 20 $. Avant les frais : 17 × 40 = 680 $ de gains, 33 × 20 = 660 $ de pertes, soit <b>+20 $</b>. On gagne un peu. Mais chaque position coûte <b>1 $</b> de frais (le spread, leçon 21) : 50 × 1 = 50 $. Au total : 20 − 50 = <b>−30 $</b>. L'idée ne passe pas. Le backtest vient de vous éviter de perdre votre argent.",
      },
      {
        t: "outil",
        titre: "De 3 à 50 positions",
        consigne: "Voici la courbe de cet exemple, position après position. Elle commence par trois gains. Reculez jusqu'à cinquante positions, avec et sans les frais.",
        el: <CourbeCapital />,
      },
      { t: "h", texte: "Lire le résultat" },
      {
        t: "tableau",
        entetes: ["Le résultat, frais compris", "Ce que vous faites"],
        lignes: [
          ["Négatif, ou à peine positif", "Vous <b>améliorez</b> l'idée (une seule règle à la fois, puis un nouveau test), ou vous <b>la laissez</b>. Ce n'est pas un échec : c'est de l'argent gardé."],
          ["Positif, sur 50 positions ou plus, calmes et agitées", "Vous l'essayez <b>d'abord en démo</b> (leçon 23), quelques semaines, dans les conditions du direct. Puis, si elle tient, en réel avec un petit risque."],
          ["Très positif, sur peu de positions", "Méfiance : c'est souvent un coup de chance, ou un piège (voir plus bas). Ajoutez des positions avant de conclure."],
        ],
      },
      {
        t: "qr", items: [
          { q: "Il faut des années de graphiques ?", r: "Il faut assez de setups. Une règle qui donne deux setups par semaine demande environ six mois de graphiques pour cinquante positions ; une règle plus rare demande plus loin dans le passé. Ce qui compte, c'est le nombre de positions, et des périodes variées." },
          { q: "Et si je change une règle après le test ?", r: "Alors il faut refaire tout le test avec la nouvelle règle, sur d'autres graphiques si possible. Changer une règle et garder l'ancien résultat, c'est comparer deux recettes différentes." },
          { q: "Un logiciel peut le faire pour moi ?", r: "Oui, si vos règles sont assez précises pour être écrites comme une formule. C'est même une bonne preuve que vos règles sont claires. Le rejeu à la main reste utile : il vous entraîne à voir les setups comme en direct." },
        ],
      },
      { t: "h", texte: "Deux pièges qui rendent le résultat trop beau" },
      { t: "piege", html: "<b>Regarder la suite avant de décider.</b> Un coup d'œil à droite du graphique, et vous savez déjà si le setup va gagner. Vous n'avez « pas vu » ce setup-là, qui perdait ; vous avez « bien vu » celui-ci, qui gagnait. Le résultat devient trop beau, et faux. Cachez toujours la suite." },
      { t: "piege", html: "<b>Changer ses règles en cours de route.</b> Après trois pertes, vous élargissez le stop « juste pour cette fois » ; après un gain raté de peu, vous rapprochez l'objectif. Chaque retouche ajuste les règles au passé, et ce passé ne reviendra pas. Un résultat obtenu ainsi ne dit rien de l'avenir. Une retouche, c'est un nouveau test, depuis le début." },
      { t: "h", texte: "Même un bon backtest ne promet rien" },
      { t: "p", html: "Un backtest positif dit seulement : <b>sur ce passé-là, avec ces règles-là, l'idée aurait gagné</b>. Le marché de demain ne sera pas celui d'hier. Les conditions changent, la volatilité aussi, et ce qui marchait peut cesser de marcher. C'est pourquoi on passe ensuite par la démo, puis par un petit risque en réel, et qu'on continue de noter chaque position dans son journal." },
      { t: "nimbo", texte: "La page Ma stratégie fait ce travail pour vous : vous y écrivez vos règles, et le site les teste sur des années de cours, frais compris, avant même que vous risquiez un euro fictif.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Backtest", en: "backtest", def: "Rejouer un plan de trading sur d'anciens graphiques pour voir ce qu'il aurait donné, frais compris." },
    { terme: "Rejeu des bougies", en: "bar replay", def: "Le mode des plateformes qui cache la suite et fait avancer le graphique bougie par bougie, comme en direct." },
    { terme: "Taille de l'échantillon", en: "sample size", def: "Le nombre de positions du test : au moins cinquante, pour que le hasard ne décide pas du résultat." },
    { terme: "Setup", en: "setup", def: "La situation précise, écrite dans les règles, qui déclenche une entrée." },
    { terme: "Frais", en: "trading costs", def: "Le spread et la commission, payés sur chaque position, gagnante ou perdante." },
    { terme: "Courbe du capital", en: "equity curve", def: "Le compte position après position : elle montre si une idée gagne, perd, ou tourne en rond." },
  ],
  retenir: [
    "Un <b>backtest</b>, c'est rejouer son plan sur le passé, comme à l'époque, avant d'y mettre de l'argent.",
    "Les <b>règles s'écrivent avant</b> de regarder : setup, stop, sortie, risque. Sinon, on voit ce qui arrange.",
    "On <b>cache la suite</b> et on avance <b>bougie par bougie</b>, comme en direct (le mode replay).",
    "Chaque position va dans un tableau, <b>frais compris</b> : +20 $ avant frais peut devenir −30 $ après.",
    "<b>Au moins cinquante positions</b>, sur des périodes calmes et agitées : avec trois, un coup de chance ressemble à une méthode.",
    "Un bon backtest <b>ne promet rien</b> : ensuite la démo, puis un petit risque. Et jamais de règles changées en cours de route.",
  ],
  quiz: [
    { question: "Pourquoi écrire ses règles avant de regarder le graphique ?", options: ["Pour aller plus vite", "Parce qu'après coup, on voit ce qui arrange", "Parce que les plateformes l'exigent"], correct: 1, explanation: "Devant un graphique dont on connaît la fin, on retient les trades gagnants et on oublie les perdants. Une règle écrite d'avance ne se discute pas." },
    { question: "Votre idée a gagné ses trois premières positions. Que pouvez-vous conclure ?", options: ["Qu'elle marche", "Rien encore : trois positions, c'est trop peu", "Qu'il faut doubler le risque"], correct: 1, explanation: "Avec trois positions, un coup de chance ressemble à une méthode. Il en faut au moins cinquante, sur des périodes calmes et agitées." },
    { question: "Cinquante positions, +20 $ avant frais, 1 $ de frais par position. Quel est le résultat ?", options: ["+20 $", "+70 $", "−30 $"], correct: 2, explanation: "50 positions × 1 $ = 50 $ de frais. 20 − 50 = −30 $ : l'idée ne passe pas. Un backtest sans frais embellit toujours." },
    { question: "Pendant le rejeu, vous jetez un œil à la suite pour savoir si le setup gagne. Qu'arrive-t-il au résultat ?", options: ["Il devient trop beau, et faux", "Il ne change pas", "Il devient plus prudent"], correct: 0, explanation: "Savoir la suite change vos décisions, même sans le vouloir : vous évitez les setups perdants. Le résultat ne dit plus rien de l'avenir." },
    { question: "Votre backtest est positif sur soixante positions, frais compris. Quelle est l'étape suivante ?", options: ["Tout miser en réel", "L'essayer d'abord en démo", "Ne plus jamais le vérifier"], correct: 1, explanation: "Même un bon backtest ne promet rien : le marché de demain n'est pas celui d'hier. La démo vérifie l'idée dans les conditions du direct, sans risque." },
  ],
  pratique: [
    { texte: "Écrivez vos règles dans Ma stratégie et lancez un backtest sur des années de cours, frais compris.", href: "/strategie", bouton: "Tester ma stratégie" },
    { texte: "Si elle passe, essayez-la en compte fictif et notez chaque position dans votre journal.", href: "/journal", bouton: "Ouvrir le journal" },
  ],
};

export default lecon;
