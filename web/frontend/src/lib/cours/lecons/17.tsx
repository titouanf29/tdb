import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { ConvertisseurPip, ValeurPip } from "@/components/cours/outils/PipEtLot";

// L'euro-dollar recule de 1,1000 à 1,0950 : 50 pips.
const recul = serie([[0, 1.1012], [6, 1.1], [14, 1.0985], [20, 1.0992], [28, 1.0968], [34, 1.0975], [40, 1.095, "bas"], [44, 1.0958]], { graine: 171, bruit: 0.0004 });
// L'or de 4 000 à 4 010 $.
const or = serie([[0, 3996], [6, 4000], [14, 3994], [22, 4004], [30, 4001], [38, 4010, "haut"], [42, 4006]], { graine: 172, bruit: 0.0005 });

const lecon: LeconSerie = {
  numero: 17,
  accroche: "Le prix bouge d'un seul pip. Pour l'un, c'est dix centimes. Pour l'autre, dix dollars. Pourquoi ?",
  promesse: "À la fin de cette leçon, vous saurez lire un pip et une pipette, ce qu'est un lot, et calculer ce que vaut chaque pip selon la taille de votre position, sur l'euro-dollar comme sur l'or.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Le pip, le petit pas du prix" },
      { t: "p", html: "Sur le forex, les prix bougent par toutes petites quantités. Pour en parler sans aligner les zéros, les traders ont une unité : le <span class=\"mot\">pip</span>. C'est le petit pas du prix." },
      {
        t: "liste", items: [
          "Sur l'<b>euro-dollar</b> et la plupart des paires, le pip est le <b>4e chiffre après la virgule</b> : de 1,1000 à 1,1001, le prix a monté d'un pip (0,0001).",
          "Sur les paires avec le <b>yen</b>, dont le prix s'écrit avec moins de décimales, c'est le <b>2e chiffre après la virgule</b> : de 150,00 à 150,01, un pip (0,01).",
        ],
      },
      { t: "p", html: "Votre plateforme affiche souvent <b>un chiffre de plus</b>, plus petit : 1,1000<b>5</b>. C'est la <span class=\"mot\">pipette</span>, un dixième de pip. Elle permet des prix plus fins, mais on compte toujours en pips : 1,10005, c'est un demi-pip au-dessus de 1,1000." },
      {
        t: "outil",
        titre: "Faites bouger le prix, pip par pip",
        consigne: "Montez et descendez d'un pip ou d'une pipette, sur l'euro-dollar puis sur le dollar-yen. Regardez quel chiffre change.",
        el: <ConvertisseurPip />,
      },
      {
        t: "graphique",
        cfg: { bougies: recul, niveaux: [{ prix: 1.1, label: "1,1000", couleur: "var(--cap-ink-2)" }, { prix: 1.095, label: "1,0950 : 50 pips plus bas", couleur: "var(--cap-down)" }], marques: [{ i: 6, type: "point", prix: 1.1 }, { i: 40, type: "point" }], unite: "heure" },
        legende: "De 1,1000 à 1,0950, l'euro-dollar a reculé de 0,0050 : 50 pips. Gardez ce mouvement en tête, il revient plus bas.",
      },

      { t: "h", texte: "Le lot, la taille de votre position" },
      { t: "p", html: "Un pip ne vaut rien tout seul : tout dépend de <b>la quantité</b> que vous achetez ou vendez. Cette quantité se mesure en <span class=\"mot\">lots</span>. Un <span class=\"mot\">lot standard</span>, c'est <b>100 000 unités de la première monnaie</b> de la paire. Sur l'euro-dollar, 1 lot = 100 000 euros. Ce nombre d'unités par lot s'appelle la <span class=\"mot\">taille du contrat</span> (<em>contract size</em>)." },
      { t: "p", html: "Il existe plus petit, et c'est heureux :" },
      {
        t: "tableau",
        entetes: ["Le nom", "La taille", "Sur l'euro-dollar", "Valeur d'un pip"],
        lignes: [
          ["Lot standard", "1", "100 000 €", "<b>10 $</b>"],
          ["Mini-lot", "0,10 (dix fois moins)", "10 000 €", "<b>1 $</b>"],
          ["Micro-lot", "0,01 (cent fois moins)", "1 000 €", "<b>0,10 $</b>"],
        ],
        legende: "Sur l'euro-dollar, le pip se paie en dollars, la seconde monnaie de la paire.",
      },
      { t: "p", html: "La taille que vous choisissez, c'est votre <span class=\"mot\">taille de position</span> (<em>position size</em>). Vous pouvez prendre des tailles intermédiaires : 0,05 lot, 0,23 lot… La plupart des courtiers acceptent tout multiple de 0,01." },

      { t: "h", texte: "Ce que vaut un pip" },
      { t: "p", html: "La <span class=\"mot\">valeur du pip</span> (<em>pip value</em>), c'est ce que vous gagnez ou perdez quand le prix bouge d'un pip. Le calcul est simple : la taille, multipliée par le pas. 100 000 euros × 0,0001 = <b>10 dollars</b> par pip pour un lot. Dix fois moins de lot, dix fois moins par pip." },
      { t: "exemple", html: "Le prix d'exemple commun à nos leçons : un compte de <b>2 000 $</b>, une position de <b>0,10 lot</b> sur l'euro-dollar, un stop loss à <b>20 pips</b>. Un pip vaut 1 $, donc le stop coûte <b>20 × 1 $ = 20 $</b>, soit <b>1 %</b> du compte. Avec 1 lot, le même stop coûterait 200 $ : 10 % du compte." },
      { t: "p", html: "Une nuance honnête : la valeur du pip est de 10 $ par lot sur toutes les paires où le dollar est <b>la seconde monnaie</b> (euro-dollar, livre-dollar…). Sur le dollar-yen, le pip se paie en yens, et sa valeur en dollars dépend du prix : vers 150, environ 6,70 $ par lot. Votre plateforme fait le calcul pour vous." },

      { t: "h", texte: "Sur l'or : 100 onces" },
      { t: "p", html: "Sur l'or, le lot ne compte pas des euros mais des onces. <b>Un lot, c'est le plus souvent 100 onces</b> (vérifiez la fiche de l'instrument : certains courtiers font autrement). Quand l'or bouge de 1 $, un lot gagne ou perd <b>100 $</b>. Un mini-lot (10 onces), 10 $. Un micro-lot (1 once), 1 $." },
      {
        t: "graphique",
        cfg: { bougies: or, niveaux: [{ prix: 4000, label: "4 000 $", couleur: "var(--cap-ink-2)" }, { prix: 4010, label: "4 010 $", couleur: "var(--cap-up)" }], marques: [{ i: 6, type: "point", prix: 4000 }, { i: 38, type: "point", prix: 4010 }], unite: "heure" },
        legende: "L'or passe de 4 000 à 4 010 $ : 10 $ de mouvement. Avec 1 lot (100 onces), 1 000 $ de gain. Avec 0,01 lot, 10 $.",
      },
      {
        t: "outil",
        titre: "Combien vaut votre pip ?",
        consigne: "Choisissez l'actif, la taille et le mouvement. Comparez les trois tailles pour le même mouvement.",
        el: <ValeurPip />,
      },

      { t: "h", texte: "Un lot entier, c'est énorme pour débuter" },
      { t: "p", html: "Reprenez le graphique plus haut : l'euro-dollar recule de <b>50 pips</b>. Cela arrive en une journée ordinaire. Avec 1 lot acheté à 1,1000, c'est <b>500 $</b> de perte. Avec un mini-lot, 50 $. Avec un micro-lot, <b>5 $</b>. Le mouvement est le même : seule la taille change ce qu'il vous coûte." },
      { t: "piege", html: "<b>Choisir sa taille « au feeling », ou parce que 1 lot sonne comme une unité normale.</b> Sur un compte de 2 000 $, 1 lot transforme chaque pip en 10 $ : 50 pips contre vous, et un quart du compte a disparu. On commence petit, en micro-lots, et la leçon 19 montre comment calculer la taille juste à partir de son stop." },
      { t: "qr", items: [
        { q: "Et le « point », que je vois sur certaines plateformes ?", r: "C'est un mot qui change de sens selon la plateforme : parfois une pipette, parfois un pip, parfois 1 $ sur un indice. Fiez-vous au pip, et vérifiez sur votre plateforme ce qu'elle appelle un point." },
        { q: "Pourquoi le pip est-il le 4e chiffre et non le 5e ?", r: "C'est une convention historique : pendant longtemps, les prix s'affichaient avec quatre décimales. La pipette est venue ensuite, pour des prix plus fins, sans changer l'unité que tout le monde utilisait." },
        { q: "Un micro-lot, ce n'est pas trop petit pour gagner quelque chose ?", r: "C'est fait pour apprendre sans se ruiner. Le but des débuts n'est pas de gagner gros, mais de suivre sa méthode avec un risque minuscule. La taille se monte ensuite, avec le compte et avec le calcul de la leçon 19." },
      ] },
      { t: "nimbo", texte: "Sur la page Trading, la taille de votre position fictive est affichée avant de cliquer. Faites le calcul : combien vaut un pip, combien coûte votre stop ?", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Pip", en: "pip", def: "Le petit pas du prix : 0,0001 sur l'euro-dollar, 0,01 sur les paires avec le yen." },
    { terme: "Pipette", en: "pipette", def: "Un dixième de pip, le dernier petit chiffre affiché par la plateforme." },
    { terme: "Lot", en: "lot", def: "L'unité de taille d'une position." },
    { terme: "Lot standard", en: "standard lot", def: "100 000 unités de la première monnaie de la paire (100 onces sur l'or, le plus souvent)." },
    { terme: "Mini-lot", en: "mini lot", def: "0,10 lot : dix fois plus petit qu'un lot standard." },
    { terme: "Micro-lot", en: "micro lot", def: "0,01 lot : cent fois plus petit qu'un lot standard." },
    { terme: "Valeur du pip", en: "pip value", def: "Ce que rapporte ou coûte un pip : 10 $ par lot sur l'euro-dollar." },
    { terme: "Taille du contrat", en: "contract size", def: "Le nombre d'unités dans un lot : 100 000 sur le forex, 100 onces sur l'or." },
    { terme: "Taille de position", en: "position size", def: "Le nombre de lots que vous achetez ou vendez." },
  ],
  retenir: [
    "Le <b>pip</b> est le petit pas du prix : le 4e chiffre après la virgule sur l'euro-dollar, le 2e avec le yen.",
    "La <b>pipette</b>, le chiffre en plus, vaut un dixième de pip.",
    "Un <b>lot standard</b>, c'est 100 000 unités de la première monnaie ; le mini-lot (0,10) et le micro-lot (0,01) sont dix et cent fois plus petits.",
    "Sur l'euro-dollar, un pip vaut <b>10 $</b> pour un lot, <b>1 $</b> pour un mini-lot, <b>0,10 $</b> pour un micro-lot.",
    "Sur l'or, un lot fait le plus souvent <b>100 onces</b> : 100 $ par dollar de mouvement.",
    "Plus le lot est gros, plus chaque pip pèse : 50 pips contre vous, c'est 500 $ en lot entier, 5 $ en micro-lot.",
  ],
  quiz: [
    { question: "L'euro-dollar passe de 1,1000 à 1,1025. De combien de pips a-t-il bougé ?", options: ["2,5 pips", "25 pips", "250 pips"], correct: 1, explanation: "Un pip vaut 0,0001 sur l'euro-dollar : 0,0025, c'est 25 pips." },
    { question: "Le dollar-yen passe de 150,00 à 150,40. Combien de pips ?", options: ["4 pips", "40 pips", "0,4 pip"], correct: 1, explanation: "Avec le yen, le pip est le 2e chiffre après la virgule (0,01) : 0,40, c'est 40 pips." },
    { question: "Votre plateforme affiche 1,10007. Que représente le dernier chiffre, le 7 ?", options: ["Des pips", "Des pipettes, des dixièmes de pip", "Des lots"], correct: 1, explanation: "Le chiffre en plus est la pipette : 1,10007, c'est 0,7 pip au-dessus de 1,1000." },
    { question: "Combien vaut un pip sur l'euro-dollar avec 0,10 lot ?", options: ["10 $", "1 $", "0,10 $"], correct: 1, explanation: "10 $ par pip pour un lot, donc 1 $ pour un mini-lot de 0,10. Un stop de 20 pips coûte alors 20 $." },
    { question: "Vous avez 1 lot d'or (100 onces). L'or baisse de 5 $. Combien perdez-vous ?", options: ["5 $", "50 $", "500 $"], correct: 2, explanation: "100 onces × 5 $ = 500 $. Avec 0,01 lot (1 once), ce serait 5 $." },
  ],
  pratique: [
    { texte: "Ouvrez une position fictive en petite taille et calculez ce que vaut chaque pip.", href: "/trading", bouton: "Prendre position" },
    { texte: "Retrouvez le pip, la pipette et le lot dans le glossaire.", href: "/learn/glossaire", bouton: "Ouvrir le glossaire" },
  ],
};

export default lecon;
