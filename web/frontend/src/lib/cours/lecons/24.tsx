import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { ConstructeurPlan } from "@/components/cours/outils/ConstructeurPlan";
import { EntrerOuPas } from "@/components/cours/outils/EntrerOuPas";

// L'euro-dollar en bougies de 15 minutes, l'après-midi : un support à 1,0950, un dernier sommet à 1,1030.
const setup = serie([[0, 1.1000], [5, 1.0952, "bas"], [12, 1.1030, "haut"], [20, 1.0990], [26, 1.0968], [29, 1.0946, "bas"], [36, 1.0995], [43, 1.1031, "haut"], [47, 1.1020]], { graine: 24, bruit: 0.0006 });
// La bougie qui rejette le support : une longue mèche basse, une clôture à 1,0960.
setup[29] = { o: 1.0955, h: 1.0963, l: 1.0942, c: 1.0960, v: 1000 };
setup[30] = { o: 1.0960, h: 1.0966, l: 1.0955, c: 1.0963, v: 1000 };

const SUPPORT = { prix: 1.095, zone: 0.0008, label: "Support", couleur: "var(--cap-up)" };
const STOP = { prix: 1.094, label: "Stop 1,0940", couleur: "var(--cap-down)", pointille: false };
const OBJECTIF = { prix: 1.103, label: "Dernier sommet 1,1030", couleur: "var(--cap-ocean)" };

const lecon: LeconSerie = {
  numero: 24,
  accroche: "Vous ouvrez votre plateforme et vous entrez à l'instinct ? Sans plan, vous décidez sur un coup de tête.",
  promesse: "À la fin de cette leçon, vous saurez écrire votre plan de trading, étape par étape : six questions, six réponses. Et vous saurez vous en servir avant chaque position.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Six questions, six réponses" },
      { t: "p", html: "Un <span class=\"mot\">plan de trading</span> (<em>trading plan</em>) est une feuille où vous écrivez vos règles, <b>avant de trader</b>. Sans lui, chaque décision se prend sur le moment, sous l'effet du prix qui bouge, de la peur ou de l'envie (leçon 11). Avec lui, la décision est déjà prise : vous n'avez plus qu'à vérifier." },
      { t: "p", html: "Un plan tient en <b>six questions</b>. Voici les six réponses d'un exemple simple, sur l'euro-dollar, avec un compte de 2 000 $." },
      { t: "h", texte: "1. Sur quoi, et quand ?" },
      { t: "p", html: "Choisissez <b>un ou deux marchés</b>, et <b>des heures fixes</b>. Par exemple : l'euro-dollar, <b>de 14 h à 17 h, heure de Paris</b>, quand Londres et New York sont ouverts en même temps et que le marché bouge le plus (leçon 12). Pas tout, tout le temps : on apprend à connaître un marché en le regardant tous les jours aux mêmes heures." },
      { t: "h", texte: "2. Le setup : la situation qui vous fait entrer" },
      { t: "p", html: "Le <span class=\"mot\">setup</span> est la situation précise qui vous fait entrer. Précise au point qu'un autre trader, en lisant votre plan, pourrait la reconnaître. Par exemple : <b>le prix revient sur un support, et une bougie le rejette</b> (une longue mèche basse, comme une pin bar, leçon 32). « Quand je le sens » n'est pas un setup." },
      { t: "h", texte: "3. Le stop : là où votre idée devient fausse" },
      { t: "p", html: "Le stop ne se place pas à un montant au hasard, mais <b>là où votre idée devient fausse</b>. Vous achetez parce que le support tient ? Votre idée est fausse s'il casse : le stop va <b>juste sous le support</b>, sous la mèche de la bougie de rejet." },
      { t: "h", texte: "4. Combien vous risquez" },
      { t: "p", html: "Le montant perdu si le stop est touché : <b>1 % du compte au plus</b>. Sur 2 000 $, c'est <b>20 $</b>. La taille découle de ce montant et de la distance du stop (leçon 19)." },
      { t: "h", texte: "5. Où vous sortez avec un gain" },
      { t: "p", html: "Votre objectif, le <span class=\"mot\">take profit</span>, décidé avant d'entrer. Par exemple <b>le dernier sommet</b> : là où les vendeurs ont repris la main la dernière fois." },
      {
        t: "scenes",
        titre: "Le plan, appliqué à un graphique",
        scenes: [
          { legende: "L'euro-dollar, à 15 h, en bougies de 15 minutes. Le prix redescend vers une zone où il a déjà rebondi.", cfg: { bougies: setup, jusqua: 27, unite: "quart d'heure" } },
          { legende: "<b>Le support</b>, vers 1,0950 : le prix y a rebondi plus tôt dans l'après-midi.", cfg: { bougies: setup, jusqua: 27, niveaux: [SUPPORT], unite: "quart d'heure" } },
          { legende: "<b>Le setup</b> : une bougie plonge sous le support, puis clôture au-dessus, à 1,0960. Une longue mèche basse : le support est rejeté.", cfg: { bougies: setup, jusqua: 29, niveaux: [SUPPORT], surligne: [29], unite: "quart d'heure" } },
          { legende: "<b>Le stop</b>, juste sous la mèche, à 1,0940 : 20 pips sous l'entrée. <b>La taille</b> : 20 $ ÷ (20 pips × 10 $) = 0,10 lot.", cfg: { bougies: setup, jusqua: 29, niveaux: [SUPPORT, STOP], marques: [{ i: 29, type: "achat", label: "Achat 1,0960" }], unite: "quart d'heure" } },
          { legende: "<b>L'objectif</b>, le dernier sommet, à 1,1030 : 70 pips plus haut, soit 70 $ avec 0,10 lot.", cfg: { bougies: setup, jusqua: 29, niveaux: [SUPPORT, STOP, OBJECTIF], marques: [{ i: 29, type: "achat", label: "Achat 1,0960" }], unite: "quart d'heure" } },
          { legende: "La suite : le prix remonte et touche 1,1030. Ici, ça a marché. Une autre fois, ce sera le stop : <b>le plan ne garantit pas le gain</b>, il limite la perte et vous évite d'improviser.", cfg: { bougies: setup, niveaux: [SUPPORT, STOP, OBJECTIF], marques: [{ i: 29, type: "achat", label: "Achat 1,0960" }], unite: "quart d'heure" } },
        ],
      },
      {
        t: "exemple",
        html: "Entrée à <b>1,0960</b>, stop à <b>1,0940</b> : 20 pips de risque. À 10 $ le pip pour 1 lot, 0,10 lot fait 1 $ le pip : 20 pips × 1 $ = <b>20 $</b>, 1 % de 2 000 $. L'objectif à <b>1,1030</b> est à 70 pips : <b>70 $</b> si tout se passe bien, trois fois et demie le risque.",
      },
      { t: "h", texte: "6. Ce que vous ne faites jamais" },
      { t: "p", html: "Les erreurs qui coûtent cher, interdites d'avance. Par exemple : <b>entrer juste avant une annonce forte</b> (leçon 13), quand le prix peut sauter votre stop ; et <b>reculer votre stop</b> quand le prix va contre vous (leçon 20). Écrites à froid, ces règles vous protègent au moment où vous auriez envie de les oublier." },
      { t: "h", texte: "Écrivez le vôtre, à froid" },
      { t: "p", html: "Votre plan s'écrit <b>avant d'ouvrir la plateforme</b>, à froid. Pas pendant que le prix bouge, pas après une perte. Prenez un moment calme, et répondez aux six questions." },
      {
        t: "outil",
        titre: "Construisez votre plan",
        consigne: "Pour chaque question, choisissez un exemple ou écrivez votre réponse. Le plan et sa checklist s'écrivent en dessous, au fur et à mesure. Copiez-le ou imprimez-le.",
        el: <ConstructeurPlan />,
      },
      { t: "h", texte: "Le relire avant chaque position, comme une checklist" },
      { t: "p", html: "Avant chaque position, relisez votre plan comme une <span class=\"mot\">checklist</span>, une liste à cocher. Trois questions : <b>la bonne heure, le bon marché ? Mon setup est là ? Mon stop et ma taille sont prêts ?</b> Trois oui : vous pouvez entrer. <b>Une seule case vide, et vous n'entrez pas.</b> Et aucune règle « jamais » ne doit être en jeu." },
      {
        t: "outil",
        titre: "J'entre ou pas ?",
        consigne: "Le plan d'exemple, cinq situations. Décidez, puis regardez la checklist se remplir.",
        el: <EntrerOuPas />,
      },
      { t: "h", texte: "L'essayer, le noter, le corriger" },
      { t: "p", html: "Un plan neuf s'essaie <b>en démo</b> (leçon 23). Notez chaque position dans votre journal, et relisez-le <b>une fois par semaine</b>. Vous y verrez ce qui marche, et ce qui revient." },
      {
        t: "exemple",
        titre: "Une règle de plus",
        html: "En relisant un mois de journal, vous voyez que <b>vos pertes arrivent souvent le vendredi soir</b> : fatigue, envie de « finir la semaine en beauté ». Vous ajoutez une règle à la question 6 : <b>pas d'entrée le vendredi soir</b>. C'est ainsi qu'un plan s'améliore : par vos propres erreurs, notées.",
      },
      { t: "piege", html: "<b>Changer son plan en pleine position.</b> Le prix va contre vous, et votre stop vous semble soudain « trop près ». Vous le reculez « juste cette fois ». C'est exactement la décision à chaud que le plan devait empêcher. <b>En position, vous suivez le plan. Vous le corrigez à froid, le week-end</b>, journal en main." },
      {
        t: "qr",
        items: [
          { q: "Mon plan doit-il être long ?", r: "Non : six réponses courtes, sur une page. Un plan trop long ne se relit pas avant chaque position, et un plan qu'on ne relit pas ne sert à rien." },
          { q: "Et si mon setup ne se présente pas ?", r: "Vous n'entrez pas. Les journées sans position font partie du plan. Le marché sera là demain." },
          { q: "Un plan garantit-il de gagner ?", r: "Non. Il garantit que vos pertes restent petites et que vos décisions sont les mêmes d'un jour à l'autre : c'est ce qui permet de savoir, avec le journal, si votre méthode tient." },
        ],
      },
      { t: "nimbo", texte: "Sur la page Ma stratégie, vous pouvez écrire vos règles d'entrée, de stop et de risque. Je les applique ensuite sur l'analyse de chaque actif, et vous pouvez les tester sur les années passées.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Plan de trading", en: "trading plan", def: "Vos règles écrites avant de trader : six questions, six réponses." },
    { terme: "Setup", en: "setup", def: "La situation précise qui vous fait entrer, assez claire pour qu'un autre la reconnaisse." },
    { terme: "Stop", en: "stop loss", def: "Le prix où votre idée devient fausse, et où la position se ferme avec une petite perte." },
    { terme: "Objectif", en: "take profit", def: "Le prix où vous sortez avec un gain, décidé avant d'entrer." },
    { terme: "Liste à cocher", en: "checklist", def: "Les questions relues avant chaque position : trois oui pour entrer, une case vide et vous n'entrez pas." },
  ],
  retenir: [
    "Un plan, ce sont <b>six réponses écrites avant de trader</b> : sur quoi et quand, le setup, le stop, le risque, l'objectif, les interdits.",
    "Le <b>setup</b> est une situation précise ; le <b>stop</b>, là où votre idée devient fausse.",
    "<b>1 % du compte au plus</b> : 20 $ sur 2 000 $.",
    "Écrivez-le <b>à froid</b>, avant d'ouvrir la plateforme.",
    "Relisez-le <b>avant chaque position</b> : trois oui pour entrer, une case vide et vous n'entrez pas.",
    "Essayez-le en démo, notez tout, et <b>corrigez-le le week-end</b>, jamais en position.",
  ],
  quiz: [
    { question: "Quand écrire son plan de trading ?", options: ["Pendant la séance, selon le marché", "Avant d'ouvrir la plateforme, à froid", "Après une grosse perte"], correct: 1, explanation: "À froid, avant de trader : c'est le seul moment où l'on décide sans l'influence du prix qui bouge ni des émotions." },
    { question: "Où placer le stop d'un achat sur un support ?", options: ["À 5 $ de l'entrée, toujours", "Juste sous le support, là où l'idée devient fausse", "Pas de stop, le support tient"], correct: 1, explanation: "Vous achetez parce que le support tient : votre idée est fausse s'il casse. Le stop va juste en dessous." },
    { question: "Votre compte fait 2 000 $. Combien risquer au plus par position ?", options: ["20 $", "200 $", "2 000 $"], correct: 0, explanation: "1 % de 2 000 $, c'est 20 $. Une série de pertes reste alors supportable." },
    { question: "Bonne heure, bon setup, mais votre taille n'est pas calculée. Que faire ?", options: ["Entrer quand même, c'est un détail", "Ne pas entrer tant que la case est vide", "Doubler la taille pour compenser"], correct: 1, explanation: "Une seule case vide, et vous n'entrez pas. Calculez la taille, puis relisez la checklist." },
    { question: "Votre stop vous semble trop près, en pleine position. Que faire ?", options: ["Le reculer un peu", "Fermer et rouvrir plus gros", "Suivre le plan, et en reparler à froid le week-end"], correct: 2, explanation: "On ne change pas son plan en position. On le corrige à froid, journal en main." },
  ],
  pratique: [
    { texte: "Écrivez vos règles sur la page Ma stratégie, et testez-les.", href: "/strategie", bouton: "Ouvrir Ma stratégie" },
    { texte: "Essayez votre plan sur le compte d'entraînement, et notez chaque position.", href: "/journal", bouton: "Ouvrir le journal" },
  ],
};

export default lecon;
