import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { DoublerMise } from "@/components/cours/outils/DoublerMise";
import { StopRecule } from "@/components/cours/outils/StopRecule";
import { ChecklistReflexes } from "@/components/cours/outils/ChecklistReflexes";

// Un achat à 1,1000 (bougie 16), puis une baisse qui ne s'arrête pas : 1,0880 à la fin.
const chute = serie([[0, 1.0975], [9, 1.1012], [16, 1.1000], [22, 1.0978], [27, 1.0985], [33, 1.0945], [38, 1.0952], [44, 1.0905], [50, 1.0880]], { graine: 201, bruit: 0.0006 });
// Un marché calme, puis une annonce forte : une bougie énorme, dans un sens puis dans l'autre.
const annonce = serie([[0, 1.0995], [12, 1.1003], [24, 1.0998], [30, 1.1002], [31, 1.0958, "bas"], [33, 1.0990], [36, 1.1012, "haut"], [44, 1.0996]], { graine: 202, bruit: 0.0004, meche: 1.4 });

const ENTREE = { prix: 1.1, label: "Achat 1,1000", couleur: "var(--cap-ink)", pointille: false };

const lecon: LeconSerie = {
  numero: 20,
  accroche: "Cinq erreurs coûtent très cher aux débutants. Vous en faites peut-être déjà une.",
  promesse: "À la fin de cette leçon, vous saurez reconnaître ces cinq erreurs, et vous aurez pour chacune le bon réflexe à mettre à la place.",
  parties: [{
    titre: "",
    blocs: [
      { t: "p", html: "Ces cinq erreurs ont un point commun : aucune ne vient d'une mauvaise analyse. On peut lire parfaitement un graphique et vider son compte avec elles. Elles viennent toutes de la <b>gestion du risque</b> (leçon 7), et de nos émotions (leçon 11). La bonne nouvelle : chacune a un remède simple. Les exemples reprennent le même compte : <b>2 000 $</b>, l'euro-dollar, un risque de 1 %." },

      { t: "h", texte: "Erreur 1 : trader sans stop loss" },
      { t: "p", html: "Sans <span class=\"mot\">stop loss</span>, rien ne ferme votre position quand le prix part contre vous. La perte grossit, <b>sans limite</b>. Et plus elle grossit, plus il devient difficile de fermer : on attend « que ça revienne », et parfois ça ne revient pas." },
      {
        t: "scenes",
        titre: "Une perte que rien n'arrête",
        scenes: [
          { legende: "Vous achetez 0,10 lot à <b>1,1000</b>, sans stop. Sur cette taille, un pip vaut 1 $.", cfg: { bougies: chute, jusqua: 16, niveaux: [ENTREE], marques: [{ i: 16, type: "achat", label: "Achat" }], unite: "heure" } },
          { legende: "Le prix baisse de 20 pips : <b>20 $ de perte</b>. « Ça va remonter. »", cfg: { bougies: chute, jusqua: 24, niveaux: [ENTREE], marques: [{ i: 16, type: "achat", label: "Achat" }], notes: [{ i: 23, prix: 1.0975, texte: "− 20 $", couleur: "var(--cap-down)", dessous: true }], unite: "heure" } },
          { legende: "60 pips plus bas : <b>60 $</b>. Le petit rebond donne de l'espoir, puis la baisse reprend.", cfg: { bougies: chute, jusqua: 36, niveaux: [ENTREE], marques: [{ i: 16, type: "achat", label: "Achat" }], notes: [{ i: 33, prix: 1.0942, texte: "− 60 $", couleur: "var(--cap-down)", dessous: true }], unite: "heure" } },
          { legende: "120 pips : <b>120 $</b>, six fois le risque qu'un stop aurait coupé. Et rien ne dit que ça s'arrête là.", cfg: { bougies: chute, niveaux: [ENTREE], marques: [{ i: 16, type: "achat", label: "Achat" }], notes: [{ i: 48, prix: 1.0880, texte: "− 120 $", couleur: "var(--cap-down)", dessous: true }], zones: [{ i0: 16, i1: 50, p0: 1.088, p1: 1.1, couleur: "var(--cap-down)" }], unite: "heure" } },
          { legende: "Le même trade avec un stop posé avant d'entrer, à 1,0980 : la perte s'arrête à <b>20 $</b>, là où vous l'aviez décidé.", cfg: { bougies: chute, niveaux: [ENTREE, { prix: 1.098, label: "Stop 1,0980", couleur: "var(--cap-down)", pointille: false, epaisseur: 2 }], marques: [{ i: 16, type: "achat", label: "Achat" }, { i: 21, type: "croix", prix: 1.098 }], zones: [{ i0: 16, i1: 21, p0: 1.098, p1: 1.1, couleur: "var(--cap-down)" }], unite: "heure" } },
        ],
      },
      { t: "p", html: "<b>Le bon réflexe :</b> le stop se pose <b>avant d'entrer</b>, en même temps que l'ordre (leçon 14), là où votre idée devient fausse (leçon 7). Pas « tout à l'heure », pas « dans ma tête » : un vrai ordre sur la plateforme." },

      { t: "h", texte: "Erreur 2 : une position trop grosse" },
      { t: "p", html: "Avec l'effet de levier (leçon 18), la plateforme vous laisse ouvrir bien plus gros que ce que votre compte peut encaisser. C'est le <span class=\"mot\">surlevier</span> (en anglais <em>over-leverage</em>) : une position si grosse qu'un trade ordinaire fait un trou dans le compte." },
      {
        t: "tableau",
        entetes: ["Sur 2 000 $, stop à 20 pips", "1 lot", "0,10 lot"],
        lignes: [
          ["Valeur d'un pip", "10 $", "1 $"],
          ["Perte si le stop est touché", "<b>200 $</b>", "<b>20 $</b>"],
          ["Part du compte", "<b>10 %</b>", "<b>1 %</b>"],
          ["Après cinq pertes de suite", "il reste environ 1 180 $", "il reste environ 1 900 $"],
        ],
        legende: "Cinq pertes à 10 % du capital du moment : 2 000 × 0,9 puissance 5, environ 1 181 $. À 1 % : environ 1 902 $.",
      },
      { t: "p", html: "<b>Le bon réflexe :</b> la taille se calcule avec le risque, jamais au feeling. Le calcul en trois étapes de la leçon 19 donne 0,10 lot : 20 $ de risque, 1 % du compte." },

      { t: "h", texte: "Erreur 3 : vouloir se refaire" },
      { t: "p", html: "Une perte, ça pique. La tentation : doubler la mise au trade suivant, « pour tout rattraper d'un coup ». Les traders appellent ça le <span class=\"mot\">revenge trading</span>, trader pour se venger du marché ; doubler systématiquement porte un nom, la <span class=\"mot\">martingale</span>. Le marché, lui, ne sait pas que vous avez perdu : le trade suivant n'a pas plus de chances de gagner. Seule sa taille a changé." },
      {
        t: "outil",
        titre: "Doubler, ou garder la même taille ?",
        consigne: "Faites perdre le compte, une perte après l'autre, et comparez les deux façons de faire.",
        el: <DoublerMise capital={2000} />,
      },
      { t: "p", html: "<b>Le bon réflexe :</b> après une perte, <b>gardez la même taille</b>, ou faites une pause. Après deux ou trois pertes de suite, fermez la plateforme pour la journée : vos décisions suivantes seraient prises sous le coup de l'émotion." },

      { t: "h", texte: "Erreur 4 : entrer sans plan" },
      { t: "p", html: "Entrer parce que « ça monte », parce qu'une vidéo l'a dit, parce qu'on s'ennuie. Sans <span class=\"mot\">plan de trading</span>, chaque décision se prend dans l'instant, et l'instant est rarement bon conseiller. Avant d'entrer, votre plan répond à trois questions :" },
      {
        t: "liste", numerotee: true,
        items: [
          "<b>Où j'entre</b>, et pourquoi : la situation précise qui me fait entrer.",
          "<b>Où est mon stop</b> : là où mon idée devient fausse.",
          "<b>Combien je risque</b> : 1 %, d'où la taille.",
        ],
      },
      { t: "p", html: "Il dit aussi <b>quand rester dehors</b> : juste avant une annonce forte (leçon 13), quand le prix peut sauter de plusieurs dizaines de pips en une minute, dans un sens puis dans l'autre." },
      {
        t: "graphique",
        cfg: { bougies: annonce, surligne: [31, 36], notes: [{ i: 31, prix: 1.0958, texte: "Annonce, 14 h 30", dessous: true }], unite: "minute" },
        legende: "Des bougies d'une minute. Le marché est calme, puis l'annonce tombe : 45 pips de baisse en une minute, puis 50 pips de hausse dans la foulée. Un stop à 20 pips, d'un côté comme de l'autre, saute en quelques secondes.",
      },
      { t: "p", html: "<b>Le bon réflexe :</b> écrire son plan avant de trader (leçon 24 pour le plan complet), et consulter le calendrier des annonces chaque matin." },

      { t: "h", texte: "Erreur 5 : reculer son stop" },
      { t: "p", html: "Le prix s'approche de votre stop. Vous le descendez « juste un peu », pour lui laisser de la place. Puis encore un peu. Votre risque grandit, <b>sans que vous l'ayez décidé</b> : vous l'avez décidé sous la pression, ce qui est l'inverse d'une décision." },
      {
        t: "outil",
        titre: "Le stop qui recule",
        consigne: "Vous avez acheté 0,10 lot à 1,1000, stop à 1,0980 (20 $). Le prix s'en approche. Déplacez le stop si vous le voulez, puis voyez la suite.",
        el: <StopRecule />,
      },
      { t: "p", html: "<b>Le bon réflexe :</b> un stop peut <b>se rapprocher</b> (par exemple remonter sous un nouveau creux quand le prix va dans votre sens), <b>jamais s'éloigner</b>. Reculé de 20 à 60 pips, il fait passer votre risque de 20 $ à 60 $ : trois fois ce que vous aviez prévu." },
      { t: "piege", html: "<b>Se souvenir de la fois où ça a marché.</b> Un jour, vous avez reculé votre stop, et le prix est revenu. Ce souvenir est dangereux : il pousse à recommencer, jusqu'au jour où le prix ne revient pas. Une seule grosse perte efface alors des dizaines de petits trades gagnés. Une règle se juge sur cent trades, pas sur un." },

      { t: "h", texte: "Les cinq bons réflexes" },
      {
        t: "tableau",
        entetes: ["L'erreur", "Le bon réflexe", "Pour aller plus loin"],
        lignes: [
          ["Pas de stop loss", "Le stop posé avant d'entrer", "Leçons 7 et 14"],
          ["Une position trop grosse", "La taille calculée avec le risque, 1 %", "Leçons 17, 18 et 19"],
          ["Vouloir se refaire", "La même taille après une perte, ou une pause", "Leçons 7 et 11"],
          ["Entrer sans plan", "Entrée, stop, risque ; pas d'annonce forte", "Leçons 13, 15 et 16"],
          ["Reculer son stop", "Un stop se rapproche, jamais ne s'éloigne", "Leçons 7 et 15"],
        ],
      },
      {
        t: "outil",
        titre: "Avant chaque trade",
        consigne: "Cochez chaque réflexe seulement s'il est vrai pour le trade que vous préparez.",
        el: <ChecklistReflexes />,
      },
      {
        t: "qr", items: [
          { q: "Et si je suis sûr de mon trade ?", r: "C'est justement là que ces erreurs arrivent : on retire le stop, on grossit la taille. Aucun trade n'est sûr. La plupart des particuliers perdent de l'argent sur les CFD, et presque toujours à cause de ces erreurs-là, pas d'une mauvaise analyse." },
          { q: "J'ai déjà fait une de ces erreurs. C'est grave ?", r: "Tout le monde les a faites. L'important est de s'en rendre compte. Notez chaque trade dans un journal, avec la règle respectée ou non : au bout de quelques semaines, vous saurez laquelle vous guette." },
          { q: "Le compte démo suffit-il pour s'en défaire ?", r: "C'est le bon endroit pour prendre les réflexes, sans risquer d'argent (leçon 23). Mais les émotions y sont plus faibles : gardez les mêmes règles quand l'argent devient réel." },
        ],
      },
      { t: "nimbo", texte: "Dans votre journal, notez pour chaque trade si les cinq réflexes étaient là. Je vous aiderai à voir lequel saute le plus souvent.", humeur: "prudent" },
    ],
  }],
  mots: [
    { terme: "Stop loss", en: "stop loss", def: "L'ordre qui ferme la position si le prix va contre vous. Posé avant d'entrer, il fixe la perte maximale." },
    { terme: "Surlevier", en: "over-leverage", def: "Une position trop grosse pour le compte : un seul trade ordinaire en emporte une grosse part." },
    { terme: "Revenge trading", en: "revenge trading", def: "Trader pour se refaire après une perte, souvent en augmentant la mise. Une décision d'émotion." },
    { terme: "Plan de trading", en: "trading plan", def: "Vos règles écrites avant de trader : où entrer, où mettre le stop, combien risquer, quand rester dehors." },
    { terme: "Martingale", en: "martingale", def: "Doubler la mise après chaque perte. Quatre pertes : 1 + 2 + 4 + 8 = 15 % du compte." },
  ],
  retenir: [
    "<b>Pas de stop</b> : la perte n'a plus de limite. Le stop se pose <b>avant</b> d'entrer.",
    "<b>Trop gros</b> : 1 lot sur 2 000 $ avec 20 pips de stop, c'est 200 $, 10 % du compte. 0,10 lot : 20 $, 1 %.",
    "<b>Se refaire</b> en doublant : 15 % du compte en quatre pertes, contre 4 % à taille égale.",
    "<b>Un plan avant d'entrer</b> : l'entrée, le stop, le risque, et pas d'annonce forte.",
    "<b>Un stop se rapproche, jamais ne s'éloigne</b> : reculé, il fait passer le risque de 20 $ à 60 $.",
    "Ces réflexes ne garantissent pas de gagner : ils garantissent que <b>chaque perte reste celle que vous aviez décidée</b>.",
  ],
  quiz: [
    { question: "Quand faut-il poser son stop loss ?", options: ["Avant d'entrer, avec l'ordre", "Quand le trade commence à perdre", "Seulement sur les gros trades"], correct: 0, explanation: "Posé avant d'entrer, à froid, il fixe la perte maximale. Plus tard, l'émotion décide à votre place." },
    { question: "Compte de 2 000 $, 1 lot sur l'euro-dollar, stop à 20 pips. Combien perdez-vous si le stop est touché ?", options: ["20 $", "200 $", "2 000 $"], correct: 1, explanation: "20 pips × 10 $ = 200 $, soit 10 % du compte en un seul trade. Avec 0,10 lot : 20 $, 1 %." },
    { question: "Vous doublez la mise après chaque perte, en partant de 1 %. Combien avez-vous perdu après quatre pertes ?", options: ["4 %", "8 %", "15 %"], correct: 2, explanation: "1 + 2 + 4 + 8 = 15 % du compte. À taille égale, quatre pertes coûtent 4 %." },
    { question: "Le prix s'approche de votre stop. Que faites-vous ?", options: ["Je le recule pour laisser de la place", "Je le laisse où il est", "Je l'enlève"], correct: 1, explanation: "Le stop est là où l'idée devient fausse. Le reculer augmente le risque sans l'avoir décidé : il peut se rapprocher, jamais s'éloigner." },
    { question: "Une annonce forte tombe dans cinq minutes. Votre plan dit :", options: ["J'entre vite avant l'annonce", "Je reste dehors et j'attends que le prix se calme", "Je double la taille pour profiter du mouvement"], correct: 1, explanation: "Juste avant une annonce forte, le prix peut sauter de dizaines de pips dans un sens puis dans l'autre. Le plan dit de rester dehors." },
  ],
  pratique: [
    { texte: "Notez vos trades fictifs avec, pour chacun, les réflexes respectés.", href: "/journal", bouton: "Ouvrir le journal" },
    { texte: "Regardez les annonces fortes de la semaine avant de trader.", href: "/macro", bouton: "Voir l'agenda macro" },
  ],
};

export default lecon;
