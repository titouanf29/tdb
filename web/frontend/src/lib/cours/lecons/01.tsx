import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { LecteurUnites } from "@/components/cours/outils/LecteurUnites";
import { DevineFigure } from "@/components/cours/outils/DevineFigure";

// Le premier graphique : une hausse tranquille, pour poser les deux axes.
const axes = serie([[0, 3920], [8, 3945], [13, 3935], [22, 3972], [27, 3962], [36, 3990], [40, 4000]], { graine: 11, bruit: 0.0016 });
// Un même cours, en ligne puis en bougies.
const lignebougie = serie([[0, 3960], [6, 3985, "haut"], [11, 3968, "bas"], [18, 4010, "haut"], [23, 3992, "bas"], [30, 4000]], { graine: 12, bruit: 0.0018 });
// Les trois états du marché.
const hausse = serie([[0, 100], [6, 104, "haut"], [10, 101.5, "bas"], [17, 107, "haut"], [22, 104.5, "bas"], [29, 110.5, "haut"], [34, 107.5, "bas"], [41, 114, "haut"], [45, 111.5, "bas"], [50, 115]], { graine: 101 });
const baisse = serie([[0, 115], [6, 111, "bas"], [10, 113.5, "haut"], [17, 108, "bas"], [22, 110.5, "haut"], [29, 104.5, "bas"], [34, 107.5, "haut"], [41, 101, "bas"], [45, 103.5, "haut"], [50, 100]], { graine: 102 });
const range = serie([[0, 105], [5, 109.8, "haut"], [11, 100.2, "bas"], [18, 110, "haut"], [25, 100, "bas"], [32, 109.9, "haut"], [39, 100.1, "bas"], [46, 109.7, "haut"], [50, 106]], { graine: 103 });
// Supports et résistances dans une hausse.
const niveaux = serie([[0, 3880], [7, 3950, "haut"], [13, 3905, "bas"], [20, 3948, "haut"], [26, 3903, "bas"], [33, 3960], [38, 4050, "haut"], [44, 3995], [48, 3952, "bas"], [55, 4020], [60, 4048, "haut"], [65, 4000]], { graine: 104, bruit: 0.0015 });
// Le résumé en trois étapes, sur un même graphique.
const resume = serie([[0, 1.0820], [8, 1.0905, "haut"], [14, 1.0860, "bas"], [22, 1.0950, "haut"], [28, 1.0900, "bas"], [36, 1.1000, "haut"], [42, 1.0952, "bas"], [50, 1.1000], [54, 1.0955, "bas"], [60, 1.1000]], { graine: 105, bruit: 0.0007 });
// L'exercice : trois graphiques à reconnaître.
const ex1 = serie([[0, 1.0850], [5, 1.0880, "haut"], [9, 1.0862, "bas"], [15, 1.0918, "haut"], [20, 1.0895, "bas"], [27, 1.0955, "haut"], [32, 1.0930, "bas"], [39, 1.0990, "haut"], [43, 1.0968, "bas"], [48, 1.1000]], { graine: 111, bruit: 0.0006 });
const ex2 = serie([[0, 4010], [6, 4049, "haut"], [12, 3952, "bas"], [19, 4050, "haut"], [26, 3950, "bas"], [33, 4048, "haut"], [40, 3953, "bas"], [46, 4020]], { graine: 112, bruit: 0.0016 });
const ex3 = serie([[0, 214], [5, 206, "bas"], [9, 210.5, "haut"], [15, 200, "bas"], [20, 204.5, "haut"], [27, 193, "bas"], [32, 198, "haut"], [39, 187, "bas"], [43, 191, "haut"], [48, 185]], { graine: 113, bruit: 0.005 });

const lecon: LeconSerie = {
  numero: 1,
  accroche: "Vous ne comprenez rien aux graphiques ? Dans quelques minutes, vous saurez les lire.",
  promesse: "À la fin de cette leçon, vous saurez lire les deux axes d'un graphique, reconnaître une tendance ou un range, repérer supports et résistances, et choisir dans quel ordre regarder les unités de temps.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Deux axes : le temps et le prix" },
      { t: "p", html: "Un <span class=\"mot\">graphique</span> (en anglais, <em>chart</em>) montre comment un prix a bougé. Il n'a que <b>deux axes</b> : le <b>temps</b>, de gauche à droite, et le <b>prix</b>, de bas en haut. Le passé est à gauche, le présent tout à droite. Rien de plus : tout le reste est une façon de dessiner ces deux informations." },
      {
        t: "graphique",
        cfg: { bougies: axes, type: "ligne", vivant: true, notes: [{ i: 20, prix: 3922, texte: "le temps, de gauche à droite", dessous: true }, { i: 7, prix: 3985, texte: "le prix, de bas en haut" }, { i: 36, prix: 4004, texte: "maintenant : 4 000 $" }], unite: "jour" },
        legende: "Le cours de l'once d'or (prix d'exemple), sur quarante jours. Plus la ligne est haute, plus le prix est élevé. Le dernier point, à droite, c'est maintenant.",
      },
      { t: "h", texte: "La ligne, la version simple" },
      { t: "p", html: "La façon la plus simple de dessiner un cours, c'est <b>une ligne</b> : un point par période, au prix de <b>clôture</b> (le dernier prix de la période), et des traits entre les points. La ligne monte, le prix monte. Elle descend, il baisse. C'est lisible d'un coup d'œil, mais elle cache ce qui s'est passé à l'intérieur de chaque période." },
      { t: "h", texte: "Les bougies, ce que regardent les traders" },
      { t: "p", html: "Les traders utilisent presque tous des <span class=\"mot\">bougies</span> (<em>candles</em>, ou <em>candlesticks</em>). Chaque bougie résume une période avec <b>quatre prix</b> : l'<b>ouverture</b> (le premier prix), la <b>clôture</b> (le dernier), le <b>plus haut</b> et le <b>plus bas</b>. Le rectangle, le corps, va de l'ouverture à la clôture ; les traits fins, les mèches, montrent jusqu'où le prix est allé." },
      { t: "p", html: "La couleur dit le sens : <b style=\"color:var(--cap-up)\">verte</b>, le prix a monté pendant la période (clôture au-dessus de l'ouverture) ; <b style=\"color:var(--cap-down)\">rouge</b>, il a baissé. Ici, c'est un aperçu : la leçon 3 les explique en détail." },
      {
        t: "scenes",
        titre: "Le même cours, en ligne puis en bougies",
        scenes: [
          { legende: "En ligne : on voit la direction, et c'est tout.", cfg: { bougies: lignebougie, type: "ligne" } },
          { legende: "En bougies : le même cours, mais chaque période raconte maintenant son histoire. Survolez ou touchez une bougie pour lire ses quatre prix.", cfg: { bougies: lignebougie, unite: "jour" } },
          { legende: "Une bougie verte : le prix a fini plus haut qu'il n'a commencé. Une rouge : plus bas. Les mèches montrent les excursions, même celles que la ligne ne montrait pas.", cfg: { bougies: lignebougie, surligne: [6, 11], unite: "jour" } },
        ],
      },
      { t: "h", texte: "La tendance : haussière, baissière, ou range" },
      { t: "p", html: "Le prix ne monte jamais en ligne droite : il avance en zigzag, avec des <b>sommets</b> (il monte, puis redescend) et des <b>creux</b> (il descend, puis remonte). La <span class=\"mot\">tendance</span> (<em>trend</em>) se lit en comparant ces points entre eux." },
      {
        t: "scenes",
        titre: "Lire la tendance, point par point",
        scenes: [
          { legende: "Un cours qui monte. Mais comment le dire avec certitude ?", cfg: { bougies: hausse } },
          { legende: "Marquez les <b>sommets</b> : chacun est plus haut que le précédent.", cfg: { bougies: hausse, marques: [{ i: 6, type: "point", prix: 104 }, { i: 17, type: "point", prix: 107 }, { i: 29, type: "point", prix: 110.5 }, { i: 41, type: "point", prix: 114 }] } },
          { legende: "Puis les <b>creux</b> : chacun aussi est plus haut que le précédent. Sommets et creux de plus en plus hauts : c'est une <b>tendance haussière</b> (<em>bullish</em>).", cfg: { bougies: hausse, marques: [{ i: 6, type: "point", prix: 104 }, { i: 17, type: "point", prix: 107 }, { i: 29, type: "point", prix: 110.5 }, { i: 41, type: "point", prix: 114 }, { i: 10, type: "point", prix: 101.5 }, { i: 22, type: "point", prix: 104.5 }, { i: 34, type: "point", prix: 107.5 }, { i: 45, type: "point", prix: 111.5 }], traits: [{ de: [10, 101.5], a: [45, 111.5], couleur: "var(--cap-up)" }] } },
        ],
      },
      { t: "p", html: "L'inverse donne une <b>tendance baissière</b> (<em>bearish</em>) : des sommets de plus en plus bas, et des creux de plus en plus bas. Et quand les sommets et les creux restent à peu près au même niveau, le prix fait du sur-place entre deux niveaux : c'est un <span class=\"mot\">range</span>. Il n'y a pas de tendance." },
      {
        t: "graphique",
        cfg: { bougies: baisse, marques: [{ i: 10, type: "point", prix: 113.5 }, { i: 22, type: "point", prix: 110.5 }, { i: 34, type: "point", prix: 107.5 }, { i: 45, type: "point", prix: 103.5 }, { i: 6, type: "point", prix: 111 }, { i: 17, type: "point", prix: 108 }, { i: 29, type: "point", prix: 104.5 }, { i: 41, type: "point", prix: 101 }], traits: [{ de: [10, 113.5], a: [45, 103.5], couleur: "var(--cap-down)" }] },
        legende: "Une tendance baissière : chaque sommet et chaque creux est plus bas que le précédent.",
      },
      {
        t: "graphique",
        cfg: { bougies: range, niveaux: [{ prix: 110, label: "Plafond", couleur: "var(--cap-down)" }, { prix: 100, label: "Plancher", couleur: "var(--cap-up)" }] },
        legende: "Un range : le prix va et vient entre 100 et 110, sans aller nulle part. La leçon 34 lui est consacrée.",
      },
      { t: "p", html: "Pourquoi s'en soucier ? Parce qu'on ne fait pas la même chose dans les trois cas. En tendance haussière, on cherche plutôt à acheter quand le prix revient vers un creux. En baisse, l'inverse. En range, on joue les bords, ou l'on attend. La leçon 28 apprend à lire cette structure en détail." },
      {
        t: "outil",
        titre: "Hausse, baisse ou range ?",
        consigne: "Trois graphiques, sur trois marchés différents. Pour chacun, dites ce que vous voyez : la correction se dessine.",
        el: <DevineFigure question="Que fait ce marché ?"
          options={[{ v: "hausse", texte: "Tendance haussière" }, { v: "baisse", texte: "Tendance baissière" }, { v: "range", texte: "Range" }]}
          cas={[
            { bougies: ex1, bonne: "hausse", expliquer: "Les sommets montent (1,0880, 1,0918, 1,0955, 1,0990), les creux aussi : un escalier qui monte, sur l'euro-dollar.",
              correction: { marques: [{ i: 5, type: "point", prix: 1.088 }, { i: 15, type: "point", prix: 1.0918 }, { i: 27, type: "point", prix: 1.0955 }, { i: 39, type: "point", prix: 1.099 }, { i: 9, type: "point", prix: 1.0862 }, { i: 20, type: "point", prix: 1.0895 }, { i: 32, type: "point", prix: 1.093 }, { i: 43, type: "point", prix: 1.0968 }], traits: [{ de: [9, 1.0862], a: [43, 1.0968], couleur: "var(--cap-up)" }] } },
            { bougies: ex2, bonne: "range", expliquer: "Trois fois vers 4 050 $, trois fois vers 3 950 $ : le prix tourne en rond entre un plancher et un plafond, sur l'or.",
              correction: { niveaux: [{ prix: 4050, label: "Plafond", couleur: "var(--cap-down)" }, { prix: 3950, label: "Plancher", couleur: "var(--cap-up)" }] } },
            { bougies: ex3, bonne: "baisse", expliquer: "Chaque rebond s'arrête plus bas que le précédent, et chaque creux est plus bas aussi : une tendance baissière, sur une action.",
              correction: { marques: [{ i: 9, type: "point", prix: 210.5 }, { i: 20, type: "point", prix: 204.5 }, { i: 32, type: "point", prix: 198 }, { i: 43, type: "point", prix: 191 }, { i: 5, type: "point", prix: 206 }, { i: 15, type: "point", prix: 200 }, { i: 27, type: "point", prix: 193 }, { i: 39, type: "point", prix: 187 }], traits: [{ de: [9, 210.5], a: [43, 191], couleur: "var(--cap-down)" }] } },
          ]} />,
      },
      { t: "h", texte: "Supports et résistances" },
      { t: "p", html: "Sur un graphique, certains prix reviennent souvent. En bas, le <span class=\"mot\">support</span> (<em>support</em>) : un plancher où le prix a déjà rebondi, parce que des acheteurs s'y présentent. En haut, la <span class=\"mot\">résistance</span> (<em>resistance</em>) : un plafond où le prix a déjà bloqué, parce que des vendeurs l'y attendent. Ce sont des <b>zones</b>, pas des traits au centime près." },
      {
        t: "scenes",
        titre: "Repérer les niveaux",
        scenes: [
          { legende: "Un cours de l'or. Regardez où il a fait demi-tour.", cfg: { bougies: niveaux } },
          { legende: "Deux fois, le prix bute vers 3 950 $ : une <b>résistance</b>.", cfg: { bougies: niveaux, jusqua: 30, niveaux: [{ prix: 3950, zone: 8, label: "Résistance", couleur: "var(--cap-down)" }], marques: [{ i: 7, type: "point", prix: 3950 }, { i: 20, type: "point", prix: 3948 }] } },
          { legende: "Deux fois, il rebondit vers 3 905 $ : un <b>support</b>. Entre les deux, un petit range.", cfg: { bougies: niveaux, jusqua: 30, niveaux: [{ prix: 3950, zone: 8, label: "Résistance", couleur: "var(--cap-down)" }, { prix: 3904, zone: 8, label: "Support", couleur: "var(--cap-up)" }], marques: [{ i: 13, type: "point" }, { i: 26, type: "point" }] } },
          { legende: "Puis le prix casse la résistance. Plus tard, il revient sur 3 950 $ et rebondit : l'ancien plafond sert de plancher (la leçon 33 explique pourquoi).", cfg: { bougies: niveaux, niveaux: [{ prix: 3950, zone: 8, label: "Devenue support", couleur: "var(--cap-up)" }, { prix: 4049, zone: 8, label: "Résistance", couleur: "var(--cap-down)" }], marques: [{ i: 48, type: "achat", label: "Rebond" }] } },
        ],
      },
      { t: "h", texte: "L'unité de temps" },
      { t: "p", html: "Chaque bougie dure le même temps : une minute, une heure, quatre heures, un jour, une semaine… C'est l'<span class=\"mot\">unité de temps</span> (<em>timeframe</em>). On la choisit sur la plateforme, et elle change tout : <b>le même marché ne raconte pas la même histoire</b> en 4 heures et en mensuel." },
      {
        t: "outil",
        titre: "Le même cours, quatre histoires",
        consigne: "Changez d'unité de temps, du mensuel au 4 heures, et basculez entre ligne et bougies. Les quatre graphiques montrent le même cours, avec le même dernier prix, au même instant.",
        el: <LecteurUnites />,
      },
      { t: "p", html: "Avez-vous remarqué ? En 4 heures, le prix monte. En journalier, il baisse. En mensuel, il est dans une grande hausse. <b>Les trois sont vrais en même temps.</b> Chaque unité de temps répond à une question différente : la grande dit dans quel décor on se trouve, la petite dit ce qui se passe cette semaine." },
      {
        t: "tableau",
        entetes: ["Unité de temps", "Une bougie dure", "Ce qu'elle montre"],
        lignes: [
          ["Mensuel, hebdo", "Un mois, une semaine", "Le décor : les grandes tendances, sur des années"],
          ["Journalier", "Un jour", "La tendance de fond des semaines et des mois à venir"],
          ["4 heures, 1 heure", "4 heures, 1 heure", "Le détail des derniers jours : où entrer, où placer le stop"],
          ["15 min, 5 min, 1 min", "Quelques minutes", "Le bruit de la journée : beaucoup de mouvements sans importance"],
        ],
        legende: "Plus l'unité de temps est petite, plus il y a de bougies, et plus il y a de mouvements qui ne veulent rien dire.",
      },
      { t: "p", html: "D'où la règle : <b>commencez par la plus grande unité de temps</b>, puis descendez. Les traders appellent ça l'analyse descendante, ou <span class=\"mot\">top-down</span>. On regarde d'abord la forêt, puis les arbres." },
      {
        t: "exemple",
        html: "Reprenez l'or de l'outil. En journalier, le prix est passé d'environ 4 350 $ à 3 930 $ : <b>420 $ de baisse</b>. En 4 heures, il a rebondi de 3 930 $ à 4 000 $ : <b>70 $ de hausse</b>. Celui qui ne regarde que le 4 heures voit une hausse ; mais elle ne pèse que 70 $ face aux 420 $ de la baisse du journalier, elle-même petite face aux 2 300 $ de hausse du mensuel (d'environ 1 700 $ à 4 000 $). Lu dans l'ordre, du plus grand au plus petit, le graphique devient clair : <b>un rebond, dans un recul, dans une grande hausse</b>.",
      },
      { t: "piege", html: "<b>Ne regarder que les petites unités de temps.</b> En 5 minutes, il se passe toujours quelque chose : une bougie verte, une rouge, une mèche. On croit voir des signaux partout, on agit trop souvent, et on se bat contre la tendance de fond sans le savoir. Commencez par le journalier, au minimum." },
      { t: "h", texte: "Le résumé en 3 étapes" },
      { t: "p", html: "Devant n'importe quel graphique, faites toujours la même chose, dans le même ordre :" },
      {
        t: "liste", numerotee: true, items: [
          "<b>Commencez par la plus grande unité de temps</b> (hebdo, puis journalier) : c'est le décor.",
          "<b>Trouvez la tendance</b> : sommets et creux plus hauts, plus bas, ou au même niveau ?",
          "<b>Repérez les supports et les résistances</b> : les zones où le prix a déjà réagi, et où il pourrait réagir encore.",
        ],
      },
      {
        t: "scenes",
        titre: "Les trois étapes, sur l'euro-dollar en journalier",
        scenes: [
          { legende: "<b>1.</b> Le graphique journalier, en entier : on prend du recul.", cfg: { bougies: resume } },
          { legende: "<b>2.</b> La tendance : des creux de plus en plus hauts (1,0860, 1,0900, 1,0952). Elle est haussière.", cfg: { bougies: resume, marques: [{ i: 14, type: "point" }, { i: 28, type: "point" }, { i: 42, type: "point" }], traits: [{ de: [14, 1.086], a: [42, 1.0952], couleur: "var(--cap-up)", prolonger: true }] } },
          { legende: "<b>3.</b> Les niveaux : 1,1000 bloque (un prix rond, que tout le monde regarde), et 1,0952 a tenu deux fois. Le prix est coincé entre les deux : tout se jouera là.", cfg: { bougies: resume, traits: [{ de: [14, 1.086], a: [42, 1.0952], couleur: "var(--cap-up)", prolonger: true }], niveaux: [{ prix: 1.1, zone: 0.0008, label: "Résistance 1,1000", couleur: "var(--cap-down)" }, { prix: 1.0953, zone: 0.0008, label: "Support", couleur: "var(--cap-up)" }] } },
        ],
      },
      {
        t: "qr", items: [
          { q: "Ligne ou bougies ?", r: "Les bougies, dès que vous savez les lire : elles disent tout ce que dit la ligne, et en plus ce qui s'est passé pendant chaque période. La ligne reste utile pour voir une tendance de très loin." },
          { q: "Quelle unité de temps choisir ?", r: "Commencez par le journalier pour lire la tendance, puis le 4 heures ou l'heure pour le détail. Plus vous descendez, plus il y a de bruit. Gardez toujours la même méthode : du plus grand au plus petit." },
          { q: "Un graphique dit-il ce qui va se passer ?", r: "Non. Il montre ce qui s'est passé, et les zones où le prix a déjà réagi. Il aide à décider où agir et où se protéger, mais rien n'est garanti : c'est pour ça qu'on place toujours un stop." },
        ],
      },
      { t: "nimbo", texte: "Sur la page Analyse, choisissez un actif et changez l'unité de temps : vous verrez que le même marché change d'histoire, comme dans l'outil plus haut.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Graphique", en: "chart", def: "Le dessin du prix dans le temps : le temps de gauche à droite, le prix de bas en haut." },
    { terme: "Bougie", en: "candle, candlestick", def: "Le résumé d'une période en quatre prix : ouverture, plus haut, plus bas, clôture." },
    { terme: "Tendance", en: "trend", def: "La direction du prix, lue dans ses sommets et ses creux." },
    { terme: "Haussier, baissier", en: "bullish, bearish", def: "Qui monte (sommets et creux plus hauts), qui baisse (sommets et creux plus bas)." },
    { terme: "Range", en: "range", def: "Un prix qui fait du sur-place entre un plancher et un plafond, sans tendance." },
    { terme: "Support", en: "support", def: "Une zone où le prix a déjà arrêté de baisser : un plancher." },
    { terme: "Résistance", en: "resistance", def: "Une zone où le prix a déjà arrêté de monter : un plafond." },
    { terme: "Unité de temps", en: "timeframe", def: "La durée d'une bougie : une minute, une heure, un jour, une semaine…" },
    { terme: "Analyse descendante", en: "top-down analysis", def: "Lire les unités de temps de la plus grande à la plus petite." },
  ],
  retenir: [
    "Un graphique a <b>deux axes</b> : le temps de gauche à droite, le prix de bas en haut.",
    "La <b>ligne</b> donne la direction ; les <b>bougies</b> résument chaque période en quatre prix, vertes en hausse, rouges en baisse.",
    "Sommets et creux <b>plus hauts</b> : hausse. <b>Plus bas</b> : baisse. <b>Au même niveau</b> : range.",
    "Le <b>support</b> est un plancher, la <b>résistance</b> un plafond : des zones où le prix a déjà réagi.",
    "Le même marché raconte une histoire différente selon l'<b>unité de temps</b> : commencez par la plus grande.",
    "La méthode en trois étapes : <b>grande unité de temps, tendance, niveaux</b>.",
  ],
  quiz: [
    { question: "Sur un graphique, que montre l'axe horizontal ?", options: ["Le prix", "Le temps", "Le volume"], correct: 1, explanation: "Le temps va de gauche à droite : le passé à gauche, le présent tout à droite. Le prix, lui, se lit de bas en haut." },
    { question: "Une bougie est verte. Qu'est-ce que ça veut dire ?", options: ["La clôture est au-dessus de l'ouverture", "Le prix va monter", "Le volume est élevé"], correct: 0, explanation: "Verte, le prix a fini la période plus haut qu'il ne l'avait commencée. Elle décrit le passé, elle ne prédit rien." },
    { question: "Les sommets et les creux sont de plus en plus bas. Quelle est la tendance ?", options: ["Haussière", "Un range", "Baissière"], correct: 2, explanation: "Des sommets plus bas et des creux plus bas : c'est la définition d'une tendance baissière." },
    { question: "Le prix rebondit plusieurs fois vers 3 950 $. Comment s'appelle cette zone ?", options: ["Un support", "Une résistance", "Une tendance"], correct: 0, explanation: "Une zone où le prix arrête de baisser et repart, plusieurs fois : c'est un support, un plancher." },
    { question: "Par quelle unité de temps commencer votre analyse ?", options: ["La plus petite, pour être précis", "La plus grande, pour voir le décor", "Peu importe"], correct: 1, explanation: "On part de la plus grande (hebdo, journalier) pour connaître la tendance de fond, puis on descend vers les petites pour le détail : c'est l'analyse top-down." },
  ],
  pratique: [
    { texte: "Ouvrez l'analyse d'un actif et lisez-le en trois étapes : grande unité de temps, tendance, niveaux.", href: "/analysis", bouton: "Ouvrir l'analyse" },
    { texte: "Retrouvez chaque mot de cette leçon dans le glossaire.", href: "/learn/glossaire", bouton: "Voir le glossaire" },
  ],
};

export default lecon;
