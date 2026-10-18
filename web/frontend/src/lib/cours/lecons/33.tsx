import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { TraceNiveau } from "@/components/cours/outils/TraceNiveau";

const support = serie([[0, 103], [8, 97], [14, 92, "bas"], [22, 99], [28, 101], [36, 92.2, "bas"], [44, 98.5], [50, 97], [57, 92.1, "bas"], [66, 100.5], [72, 103]], { graine: 33 });
const resistance = serie([[0, 97], [8, 103], [14, 108, "haut"], [22, 101], [28, 99.5], [36, 107.8, "haut"], [44, 102], [50, 103], [57, 108.1, "haut"], [66, 100], [72, 97.5]], { graine: 34 });
// Les mèches dépassent : un trait à 92 serait « cassé » trois fois, la zone tient.
const zone = serie([[0, 102], [10, 96], [15, 91.4, "bas"], [24, 99], [32, 100], [40, 92.4, "bas"], [48, 98], [56, 91.7, "bas"], [66, 101], [72, 104]], { graine: 35, meche: 0.9 });
const polarite = serie([[0, 90], [8, 96], [12, 100, "haut"], [20, 94.5], [27, 99.8, "haut"], [34, 95], [40, 100.1, "haut"], [48, 106], [55, 100.6, "bas"], [64, 108], [72, 112]], { graine: 36 });
const carte = serie([[0, 58], [6, 60, "haut"], [14, 52], [20, 50, "bas"], [30, 57], [36, 59.8, "haut"], [44, 53], [50, 50.2, "bas"], [58, 55], [64, 54], [70, 59.9, "haut"], [80, 52], [86, 50.1, "bas"], [92, 54]], { graine: 37 });
const exercice = serie([[0, 48], [7, 44], [12, 41.5, "bas"], [20, 46], [26, 47.5], [33, 41.6, "bas"], [40, 45], [46, 44], [52, 41.4, "bas"], [60, 46.5], [66, 48]], { graine: 38 });

const lecon: LeconSerie = {
  numero: 33,
  accroche: "Pourquoi le prix rebondit-il souvent au même endroit ? Ce n'est pas un hasard.",
  promesse: "À la fin de cette leçon, vous saurez trouver et tracer vos supports et vos résistances, et vous saurez lesquels méritent votre attention.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Le support, un plancher" },
      { t: "p", html: "Un <span class=\"mot\">support</span>, c'est une zone où le prix a <b>arrêté de baisser, plusieurs fois</b>. À chaque fois qu'il y revient, des acheteurs se présentent, et le prix remonte. Sur le graphique, ça ressemble à un plancher sur lequel le prix rebondit." },
      {
        t: "graphique",
        cfg: { bougies: support, niveaux: [{ prix: 92.1, zone: 1.2, label: "Support", couleur: "var(--cap-up)" }], marques: [{ i: 14, type: "point" }, { i: 36, type: "point" }, { i: 57, type: "point" }], unite: "jour" },
        legende: "Trois fois, le prix descend vers 92 et repart. Les acheteurs y reviennent : c'est un support. Survolez une bougie pour lire ses quatre prix.",
      },
      { t: "h", texte: "La résistance, un plafond" },
      { t: "p", html: "Une <span class=\"mot\">résistance</span>, c'est l'inverse : une zone où le prix a <b>arrêté de monter</b>. Les vendeurs y reviennent, et le prix redescend. C'est un plafond." },
      {
        t: "graphique",
        cfg: { bougies: resistance, niveaux: [{ prix: 108, zone: 1.2, label: "Résistance", couleur: "var(--cap-down)" }], marques: [{ i: 14, type: "point", prix: 108 }, { i: 36, type: "point", prix: 107.8 }, { i: 57, type: "point", prix: 108.1 }], unite: "jour" },
        legende: "Trois fois, le prix bute vers 108 et redescend : les vendeurs défendent ce niveau.",
      },
      { t: "h", texte: "Pourquoi ça marche : le marché a de la mémoire" },
      { t: "p", html: "Un support n'a rien de magique. Il tient parce que <b>beaucoup de traders regardent les mêmes niveaux</b> et y placent leurs ordres. Celui qui a acheté à 92 et vu le prix monter à 100 se dit qu'il rachèterait volontiers à 92. Celui qui a raté le premier rebond attend le prochain passage. Et ceux qui ont vendu trop tôt veulent se racheter au même prix." },
      {
        t: "qr", items: [
          { q: "Qui achète sur un support ?", r: "Ceux qui ont raté le dernier rebond, ceux qui ont déjà gagné à cet endroit et veulent recommencer, et ceux qui avaient vendu et veulent se racheter. Leurs ordres s'accumulent au même prix." },
          { q: "Et sur une résistance ?", r: "Ceux qui ont acheté plus haut et attendent de « revenir à zéro » pour vendre, et ceux qui prennent leurs gains là où le prix a déjà calé. Leurs ventes freinent la hausse." },
          { q: "Alors ça tient à chaque fois ?", r: "Non. Un niveau tient tant que les ordres qui le défendent sont plus nombreux que ceux d'en face. Quand ils sont épuisés, le niveau cède : c'est la cassure (leçon 30)." },
        ],
      },
      { t: "h", texte: "Une zone, pas un trait" },
      { t: "p", html: "Le prix ne s'arrête presque jamais au centime près. Il <b>dépasse souvent d'un peu, avec une mèche</b>, puis revient. Si vous tracez un trait parfait, il sera « cassé » à chaque mèche et vous ne saurez plus quoi en penser. Tracez plutôt <b>une bande</b> qui englobe ces dépassements." },
      {
        t: "scenes",
        titre: "Un trait, puis une zone",
        scenes: [
          { legende: "Avec un trait à 92, le niveau semble cassé deux fois : les mèches passent dessous.", cfg: { bougies: zone, niveaux: [{ prix: 92, label: "Un trait à 92", couleur: "var(--cap-ink-2)", pointille: false }], surligne: [15, 56] } },
          { legende: "Avec une zone de 91,4 à 92,6, tout s'explique : le prix a réagi trois fois au même endroit, mèches comprises.", cfg: { bougies: zone, niveaux: [{ prix: 92, zone: 1.2, label: "La zone de support", couleur: "var(--cap-up)" }], surligne: [15, 40, 56] } },
        ],
      },
      { t: "h", texte: "Les trouver, en quatre gestes" },
      {
        t: "scenes",
        titre: "Lire un graphique de gauche à droite",
        scenes: [
          { legende: "<b>Regardez à gauche</b> du graphique, sur le passé : c'est là que les niveaux se sont formés.", cfg: { bougies: carte } },
          { legende: "<b>Cherchez les rebonds nets</b> : les endroits où le prix a fait demi-tour franchement, plusieurs fois.", cfg: { bougies: carte, marques: [{ i: 20, type: "point" }, { i: 50, type: "point" }, { i: 86, type: "point" }, { i: 6, type: "point", prix: 60 }, { i: 36, type: "point", prix: 59.8 }, { i: 70, type: "point", prix: 59.9 }] } },
          { legende: "<b>Tracez une zone</b> qui passe par ces rebonds, mèches comprises.", cfg: { bougies: carte, niveaux: [{ prix: 50.1, zone: 0.8, label: "Support", couleur: "var(--cap-up)" }, { prix: 59.9, zone: 0.8, label: "Résistance", couleur: "var(--cap-down)" }] } },
          { legende: "<b>Gardez-en deux ou trois</b>, les plus nets. Ici, deux suffisent : un plancher à 50, un plafond à 60. Entre les deux, le prix tourne en rond (c'est le range, leçon 34).", cfg: { bougies: carte, niveaux: [{ prix: 50.1, zone: 0.8, label: "Support", couleur: "var(--cap-up)" }, { prix: 59.9, zone: 0.8, label: "Résistance", couleur: "var(--cap-down)" }], zones: [{ i0: 0, i1: 92, p0: 50.5, p1: 59.5, couleur: "var(--cap-ink-3)" }] } },
        ],
      },
      { t: "h", texte: "Ce qui rend un niveau solide" },
      {
        t: "tableau",
        entetes: ["Ce qu'on regarde", "Solide", "Fragile"],
        lignes: [
          ["Le nombre de réactions", "Trois rebonds ou plus", "Un seul passage"],
          ["La netteté", "Demi-tour franc, longue mèche", "Le prix traîne autour"],
          ["L'unité de temps", "Journalier, hebdomadaire", "Cinq minutes"],
          ["L'âge", "Réactions récentes", "Un niveau d'il y a des années, jamais revu"],
          ["Le prix rond", "100, 1,1000, 2 000 : tout le monde les voit", "Un prix quelconque"],
        ],
        legende: "Plus le prix a réagi à un niveau, et plus l'unité de temps est grande, plus le niveau compte.",
      },
      { t: "h", texte: "La résistance cassée devient un support" },
      { t: "p", html: "Quand le prix casse enfin une résistance et s'installe au-dessus, ce plafond change souvent de rôle : il devient <b>un plancher</b>. Ceux qui ont raté la cassure attendent un retour sur ce niveau pour acheter. C'est le pullback (leçon 31), et les traders anglophones parlent de <span class=\"mot\">role reversal</span>." },
      {
        t: "scenes",
        titre: "Du plafond au plancher",
        scenes: [
          { legende: "Trois fois, le prix bute sous 100 : c'est une résistance.", cfg: { bougies: polarite, jusqua: 41, niveaux: [{ prix: 100, zone: 0.9, label: "Résistance", couleur: "var(--cap-down)" }] } },
          { legende: "Le prix casse le plafond et clôture nettement au-dessus.", cfg: { bougies: polarite, jusqua: 48, niveaux: [{ prix: 100, zone: 0.9, label: "Résistance cassée", couleur: "var(--cap-down)" }] } },
          { legende: "Il revient sur 100… et rebondit : l'ancien plafond sert de plancher.", cfg: { bougies: polarite, jusqua: 57, niveaux: [{ prix: 100, zone: 0.9, label: "Devenue support", couleur: "var(--cap-up)" }], marques: [{ i: 55, type: "achat", label: "Retour" }] } },
          { legende: "Puis la hausse repart. Un niveau cassé ne disparaît pas : il change de camp.", cfg: { bougies: polarite, niveaux: [{ prix: 100, zone: 0.9, label: "Support", couleur: "var(--cap-up)" }], marques: [{ i: 55, type: "achat", label: "Retour" }] } },
        ],
      },
      {
        t: "outil",
        titre: "Tracez le support",
        consigne: "Cliquez à la hauteur où le prix a rebondi plusieurs fois. Puis comparez avec la correction.",
        el: <TraceNiveau bougies={exercice} max={1} solutions={[{ prix: 41.5, tolerance: 0.7, label: "Le support" }]}
          expliquer="Trois rebonds nets, autour de 41,5 : c'est le plancher." />,
      },
      { t: "h", texte: "S'en servir pour un trade" },
      {
        t: "exemple",
        html: "Le support est la zone 91,5 à 92,6. Le prix y revient et une bougie le rejette : vous achetez à <b>93</b>. Le stop se place <b>sous la zone</b>, à 91, là où le support serait vraiment cassé : vous risquez 2 par action. L'objectif est la résistance, à <b>101</b> : vous visez 8. Le gain possible vaut <b>quatre fois</b> le risque. Avec un stop collé à 92, la moindre mèche vous aurait sorti.",
      },
      { t: "piege", html: "<b>En tracer partout.</b> Dix lignes sur un graphique, c'est une ligne tous les trois euros : le prix en touchera forcément une, et vous croirez qu'elle « marche ». Gardez deux ou trois niveaux, les plus clairs. Et souvenez-vous : <b>aucun niveau ne tient pour toujours</b>. C'est pour ça que le stop existe." },
      { t: "nimbo", texte: "Sur la page Analyse, le graphique « Commenté » trace les niveaux que je repère. Comparez-les aux vôtres : c'est un bon exercice.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Support", en: "support", def: "Une zone où le prix a arrêté de baisser plusieurs fois : un plancher." },
    { terme: "Résistance", en: "resistance", def: "Une zone où le prix a arrêté de monter plusieurs fois : un plafond." },
    { terme: "Rebond", en: "bounce", def: "Le demi-tour du prix sur un niveau." },
    { terme: "Zone", en: "zone, area", def: "La bande de prix où se trouve un niveau, mèches comprises. Plus juste qu'un trait." },
    { terme: "Changement de rôle", en: "role reversal, flip", def: "Une résistance cassée qui devient un support, ou l'inverse." },
    { terme: "Niveau psychologique", en: "round number", def: "Un prix rond (100, 1,1000) que tout le monde remarque, souvent un niveau." },
  ],
  retenir: [
    "Un <b>support</b> est un plancher, une <b>résistance</b> un plafond : des zones où le prix a réagi plusieurs fois.",
    "Ils marchent parce que <b>tout le monde regarde les mêmes niveaux</b> et y place ses ordres.",
    "Tracez des <b>zones</b>, pas des traits : les mèches dépassent souvent.",
    "Un niveau compte d'autant plus qu'il a été <b>touché souvent</b>, <b>nettement</b>, sur une <b>grande unité de temps</b>.",
    "Une résistance cassée <b>devient souvent un support</b>.",
    "Deux ou trois niveaux suffisent, et <b>aucun ne tient pour toujours</b> : le stop se place au-delà de la zone.",
  ],
  quiz: [
    { question: "Le prix est descendu trois fois vers 50 et est reparti à chaque fois. Que voyez-vous ?", options: ["Une résistance à 50", "Un support à 50", "Une tendance baissière"], correct: 1, explanation: "Un niveau où le prix arrête de baisser, plusieurs fois, est un support : un plancher." },
    { question: "Pourquoi tracer une zone plutôt qu'un trait ?", options: ["Parce que c'est plus joli", "Parce que les mèches dépassent souvent un peu le niveau", "Parce qu'un trait est interdit"], correct: 1, explanation: "Le prix réagit autour d'un niveau, pas au centime près. Une bande englobe les mèches qui dépassent." },
    { question: "Quel niveau est le plus solide ?", options: ["Un niveau touché une fois en cinq minutes", "Un niveau touché trois fois en journalier", "Un niveau tracé au hasard"], correct: 1, explanation: "Plusieurs réactions nettes, sur une grande unité de temps : c'est ce qui rend un niveau solide." },
    { question: "Le prix casse une résistance à 100, puis revient sur 100. Que se passe-t-il souvent ?", options: ["100 sert de support", "Le prix continue de baisser à coup sûr", "Le niveau n'existe plus"], correct: 0, explanation: "Une résistance cassée change souvent de rôle et devient un support : c'est le pullback." },
    { question: "Vous achetez sur un support. Où placer le stop ?", options: ["Juste au-dessus de votre prix d'achat", "Au milieu de la zone", "Sous la zone, là où le support serait vraiment cassé"], correct: 2, explanation: "Sous la zone : là où votre idée devient fausse. Collé au niveau, la moindre mèche vous sortirait." },
  ],
  pratique: [
    { texte: "Ouvrez l'analyse d'un actif et comparez vos niveaux à ceux que trace Nimbo.", href: "/analysis", bouton: "Ouvrir l'analyse" },
    { texte: "Placez un achat fictif sur un support, avec un stop sous la zone.", href: "/trading", bouton: "Prendre position" },
  ],
};

export default lecon;
