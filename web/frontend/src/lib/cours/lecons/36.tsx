import type { Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { TableauMarge } from "@/components/cours/outils/TableauMarge";

// Le cours de la vidéo (base 100 : 1 % de baisse fait 1 point), acheté à 100.
const brut = [[100, 100.6, 99.8, 100.4], [100.4, 100.5, 99.6, 99.8], [99.8, 99.9, 98.9, 99.1], [99.1, 99.7, 98.9, 99.5], [99.5, 99.6, 98.4, 98.6], [98.6, 98.8, 97.7, 97.9], [97.9, 98.5, 97.7, 98.3], [98.3, 98.4, 97, 97.2], [97.2, 97.3, 96.2, 96.4], [96.4, 97.1, 96.3, 96.9], [96.9, 97, 95.6, 95.8], [95.8, 95.9, 94.9, 95.1], [95.1, 95.7, 94.9, 95.5], [95.5, 95.6, 94.2, 94.4], [94.4, 94.6, 93.6, 93.8], [93.8, 94.3, 93.6, 94.1], [94.1, 94.2, 93.1, 93.2], [93.2, 93.4, 92.4, 92.6], [92.6, 93.1, 92.4, 92.9], [92.9, 93, 91.7, 91.9], [91.9, 92.1, 91.4, 91.6]];
const baisse: Bougie[] = brut.map(([o, h, l, c]) => ({ o, h, l, c, v: 1000 }));
const APPEL = 100 - 6.67, CLOTURE = 100 - 8.33;
const achat = { prix: 100, label: "Achat à 100", couleur: "var(--cap-ink)" };
const nAppel = { prix: APPEL, label: "Niveau de marge 100 % : appel de marge", couleur: "var(--cap-amber-ink)" };
const nCloture = { prix: CLOTURE, label: "Niveau de marge 50 % : clôture forcée", couleur: "var(--cap-down)" };

const lecon: LeconSerie = {
  numero: 36,
  accroche: "L'effet de levier, ça fait quoi, en vrai, à votre compte ? Suivons un compte de 1 000 €, jusqu'à l'appel de marge.",
  promesse: "À la fin de cette leçon, vous saurez lire les chiffres de marge de votre plateforme : la marge bloquée, la marge libre, le niveau de marge, et ce qui se passe à 100 % puis à 50 %.",
  parties: [{
    titre: "",
    blocs: [
      { t: "p", html: "Cette leçon répond à une question reçue. La leçon 18 posait les bases : le levier permet d'ouvrir plus gros que son argent, et la marge est ce que la plateforme bloque. Ici, on regarde <b>ce que ça donne sur un vrai compte</b>, ligne par ligne, comme sur l'écran d'une plateforme. Le compte et le prix sont inventés ; les règles, elles, sont les vraies." },

      { t: "h", texte: "Un compte de 1 000 €, une position de 10 000 €" },
      { t: "p", html: "Vous avez <b>1 000 €</b> sur votre compte. Le levier est de <b>30</b>, le maximum pour un particulier en Europe sur les grandes paires du forex. Vous ouvrez une position de <b>10 000 €</b> : dix fois votre compte, mais pas tout le levier." },
      { t: "p", html: "La plateforme met de côté une partie de votre argent pour tenir cette position : la <span class=\"mot\">marge</span>, ou marge bloquée. Elle vaut la taille divisée par le levier : 10 000 ÷ 30 = <b>333 €</b>. Cet argent est toujours à vous, mais vous ne pouvez plus vous en servir tant que la position est ouverte." },

      { t: "h", texte: "La marge libre : celle qui fond" },
      { t: "p", html: "Le reste du compte, c'est la <span class=\"mot\">marge libre</span> : 1 000 − 333 = <b>667 €</b>. C'est elle qui sert à ouvrir d'autres positions, et surtout <b>c'est elle qui encaisse les pertes</b>. Si le prix va contre vous, la marge bloquée ne bouge pas : c'est la marge libre qui fond." },
      { t: "p", html: "Plus précisément, la plateforme suit la <b>valeur du compte</b> : l'argent de départ, plus ou moins le gain ou la perte de la position en cours (les plateformes l'appellent souvent <em>equity</em>). La marge libre, c'est cette valeur moins la marge bloquée." },

      { t: "h", texte: "Le niveau de marge, le chiffre à surveiller" },
      { t: "p", html: "Le <span class=\"mot\">niveau de marge</span> (<em>margin level</em>) résume tout en un chiffre : <b>la valeur du compte divisée par la marge bloquée</b>, en pourcentage. Au départ : 1 000 ÷ 333 = <b>300 %</b>. Plus il est haut, plus vous avez de place. Il baisse à chaque euro perdu." },
      {
        t: "tableau",
        entetes: ["Le prix a reculé de…", "Valeur du compte", "Marge bloquée", "Marge libre", "Niveau de marge"],
        lignes: [
          ["0 % (ouverture)", "1 000 €", "333 €", "667 €", "<b>300 %</b>"],
          ["1 %", "900 €", "333 €", "567 €", "270 %"],
          ["3 %", "700 €", "333 €", "367 €", "210 %"],
          ["6,67 %", "333 €", "333 €", "0 €", "<b>100 % : appel de marge</b>"],
          ["8,33 %", "167 €", "333 €", "−167 €", "<b>50 % : clôture forcée</b>"],
        ],
        legende: "La position de 10 000 € perd 100 € pour chaque pour cent de baisse. La marge bloquée reste la même, la marge libre encaisse tout.",
      },

      { t: "h", texte: "À 100 %, l'appel de marge" },
      { t: "p", html: "Quand le niveau de marge tombe à <b>100 %</b>, la valeur du compte ne couvre plus que la marge bloquée : <b>la marge libre est à zéro</b>. Vous ne pouvez plus rien ouvrir. Le courtier vous prévient : c'est l'<span class=\"mot\">appel de marge</span> (<em>margin call</em>). Le seuil exact dépend du courtier, 100 % est le plus courant." },
      { t: "h", texte: "À 50 %, la clôture forcée" },
      { t: "p", html: "Si la perte continue et que le niveau tombe à <b>50 %</b>, le courtier <b>ferme vos positions tout seul</b>, au prix du moment, sans vous demander votre avis : c'est la <span class=\"mot\">clôture forcée</span> (<em>stop out</em>). En Europe, pour un particulier, cette règle de 50 % est imposée par l'autorité des marchés (l'ESMA) : elle sert à vous empêcher de tout perdre." },
      {
        t: "scenes",
        titre: "Le compte de 1 000 €, bougie après bougie",
        scenes: [
          { legende: "Vous achetez 10 000 € à 100. Marge bloquée : 333 €. Marge libre : 667 €. Niveau de marge : <b>300 %</b>.", cfg: { bougies: baisse, jusqua: 0, niveaux: [achat], marques: [{ i: 0, type: "achat", prix: 100 }], unite: "heure" } },
          { legende: "Le prix recule de 3 %. La perte (300 €) est prise sur la marge libre, qui tombe à 367 €. Niveau de marge : <b>210 %</b>.", cfg: { bougies: baisse, jusqua: 8, niveaux: [achat], marques: [{ i: 0, type: "achat", prix: 100 }], unite: "heure" } },
          { legende: "À 93,3, soit 6,67 % de baisse, la marge libre est à zéro : niveau de marge <b>100 %</b>. C'est l'<b>appel de marge</b>.", cfg: { bougies: baisse, jusqua: 16, niveaux: [achat, nAppel], marques: [{ i: 0, type: "achat", prix: 100 }, { i: 16, type: "point" }], unite: "heure" } },
          { legende: "À 91,7, soit 8,33 % de baisse, niveau de marge <b>50 %</b> : le courtier ferme la position. Il reste environ 167 € sur le compte.", cfg: { bougies: baisse, niveaux: [achat, nAppel, nCloture], marques: [{ i: 0, type: "achat", prix: 100 }, { i: 16, type: "point" }, { i: 20, type: "croix", prix: CLOTURE }], unite: "heure" } },
        ],
      },
      {
        t: "outil",
        titre: "Le tableau de bord du compte",
        consigne: "Réglez la taille de la position, puis faites reculer le prix, au curseur ou avec le bouton. Suivez la marge libre, le niveau de marge, l'appel de marge puis la clôture forcée. Essayez ensuite avec tout le levier, puis avec un stop.",
        el: <TableauMarge />,
      },

      { t: "h", texte: "Avec tout le levier, aucune marge d'erreur" },
      { t: "p", html: "Ouvrez maintenant <b>30 000 €</b>, tout le levier. La marge bloquée vaut 30 000 ÷ 30 = <b>1 000 €</b> : tout le compte. La marge libre est à zéro <b>dès l'ouverture</b>, le niveau de marge à 100 % (un peu moins, avec le spread de la leçon 16). Le moindre recul, et vous êtes en appel de marge." },
      { t: "exemple", html: "Tout le levier : 30 000 € ouverts avec 1 000 €. Le prix recule de <b>0,2 %</b> : 60 € de perte, la valeur du compte tombe à 940 €, le niveau de marge à <b>94 %</b>. À <b>1,67 %</b> de baisse (500 € de perte), le niveau touche 50 % : clôture forcée. La moitié du compte est partie sur un mouvement qui arrive tous les jours." },
      { t: "piege", html: "<b>Lire « marge libre » comme « argent à risquer ».</b> 667 € de marge libre ne veulent pas dire que vous pouvez ouvrir deux autres positions. Chaque position ajoutée bloque plus de marge et rapproche l'appel de marge. La marge libre est un coussin, pas un budget." },

      { t: "h", texte: "Peut-on perdre plus que son compte ?" },
      { t: "p", html: "En Europe, pour un particulier sur des CFD, <b>non</b>. Si le marché saute d'un coup (une annonce, l'ouverture du lundi) et que la clôture forcée passe trop tard, le compte pourrait finir sous zéro. La <span class=\"mot\">protection contre le solde négatif</span> interdit au courtier de vous réclamer cette somme : vous ne perdez pas plus que ce que vous avez déposé." },
      { t: "p", html: "C'est une protection précieuse, mais regardez ce qu'elle protège : la limite, c'est <b>tout votre compte</b>. Ce n'est pas une façon de gérer son risque." },

      { t: "h", texte: "Le vrai bouclier, c'est le stop" },
      { t: "p", html: "L'appel de marge et la clôture forcée sont des freins d'urgence, pas une stratégie. Celui qui les voit arriver a déjà perdu beaucoup. Le vrai bouclier, c'est le <b>stop loss posé à l'avance</b> : il coupe la perte bien avant." },
      {
        t: "graphique",
        cfg: { bougies: baisse, niveaux: [achat, { prix: 99, label: "Stop à 99 : 1 % sous l'achat", couleur: "var(--cap-down)" }, nAppel, nCloture], marques: [{ i: 0, type: "achat", prix: 100 }, { i: 2, type: "croix", prix: 99 }], unite: "heure" },
        legende: "Le même trade, avec un stop à 99. Il sort à la troisième bougie : 100 € de perte, il reste 900 €, et le niveau de marge était encore à 270 %. L'appel de marge n'est jamais arrivé.",
      },
      { t: "qr", items: [
        { q: "Où vois-je ces chiffres sur une plateforme ?", r: "En bas de l'écran, dans le résumé du compte : la balance (l'argent de départ), la valeur du compte (<em>equity</em>), la marge, la marge libre (<em>free margin</em>) et le niveau de marge (<em>margin level</em>). Ce sont exactement les cinq chiffres de cette leçon." },
        { q: "L'appel de marge, c'est un coup de téléphone ?", r: "Le nom vient de là, mais aujourd'hui c'est une alerte à l'écran, parfois un e-mail. Et il n'est pas obligé d'arriver avant la clôture forcée : dans un marché rapide, les deux peuvent se suivre en quelques secondes." },
        { q: "Si je dépose de l'argent pendant l'appel de marge ?", r: "La valeur du compte remonte, et le niveau de marge aussi. Mais remettre de l'argent pour sauver une position perdante, c'est souvent refuser de couper une erreur. Le stop, décidé à froid, évite d'en arriver là." },
      ] },
      { t: "nimbo", texte: "Sur la page Trading, avant d'ouvrir une position fictive, regardez la taille que vous prenez par rapport à votre compte. Puis posez le stop : c'est lui, et pas la plateforme, qui doit décider de votre pire perte.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Levier", en: "leverage", def: "Ce qui permet d'ouvrir plus gros que son argent : avec 30, 1 000 € en ouvrent 30 000." },
    { terme: "Marge", en: "margin", def: "L'argent bloqué pour tenir une position : la taille divisée par le levier (333 € pour 10 000 € à 30)." },
    { terme: "Marge libre", en: "free margin", def: "La valeur du compte moins la marge bloquée : c'est elle qui encaisse les pertes." },
    { terme: "Valeur du compte", en: "equity", def: "L'argent du compte, gains et pertes en cours compris." },
    { terme: "Niveau de marge", en: "margin level", def: "La valeur du compte divisée par la marge bloquée, en pourcentage (300 % au départ de l'exemple)." },
    { terme: "Appel de marge", en: "margin call", def: "L'alerte quand le niveau de marge tombe à 100 % (le plus souvent) : plus de marge libre." },
    { terme: "Clôture forcée", en: "stop out", def: "La fermeture des positions par le courtier, à 50 % de niveau de marge pour un particulier en Europe." },
    { terme: "Protection contre le solde négatif", en: "negative balance protection", def: "La règle qui interdit, en Europe, de perdre plus que l'argent du compte." },
  ],
  retenir: [
    "La <b>marge</b>, c'est l'argent bloqué : la taille divisée par le levier (10 000 € à 30 : 333 €).",
    "La <b>marge libre</b> (667 € au départ) encaisse les pertes : c'est elle qui fond quand le prix va contre vous.",
    "Le <b>niveau de marge</b> = la valeur du compte ÷ la marge bloquée : 300 % au départ de l'exemple.",
    "À <b>100 %</b>, l'appel de marge : plus de marge libre. À <b>50 %</b>, la clôture forcée : le courtier ferme tout seul.",
    "Avec tout le levier, la marge prend tout le compte : le moindre recul, et c'est l'appel de marge.",
    "En Europe, on ne perd pas plus que son compte ; mais le vrai bouclier, c'est <b>le stop</b>, qui coupe la perte bien avant.",
  ],
  quiz: [
    { question: "Compte de 1 000 €, levier de 30, position de 10 000 €. Quelle est la marge bloquée ?", options: ["1 000 €", "333 €", "30 €"], correct: 1, explanation: "La marge vaut la taille divisée par le levier : 10 000 ÷ 30 ≈ 333 €. Il reste 667 € de marge libre." },
    { question: "Le prix va contre vous. Qu'est-ce qui diminue ?", options: ["La marge bloquée", "La marge libre", "Le levier"], correct: 1, explanation: "La marge bloquée reste fixe tant que la position est ouverte. Les pertes sont prises sur la marge libre." },
    { question: "Valeur du compte 700 €, marge bloquée 333 €. Quel est le niveau de marge ?", options: ["Environ 210 %", "Environ 48 %", "367 %"], correct: 0, explanation: "Le niveau de marge est la valeur du compte divisée par la marge : 700 ÷ 333 ≈ 2,1, soit 210 %." },
    { question: "Que se passe-t-il quand le niveau de marge tombe à 50 %, pour un particulier en Europe ?", options: ["Rien, c'est une simple alerte", "Le courtier ferme les positions : la clôture forcée", "Le levier passe à 60"], correct: 1, explanation: "À 100 %, c'est l'appel de marge (une alerte, plus rien à ouvrir). À 50 %, le courtier ferme les positions lui-même." },
    { question: "Quelle est la meilleure protection contre l'appel de marge ?", options: ["Prendre tout le levier", "Déposer de l'argent quand il arrive", "Un stop loss posé à l'avance, avec une taille raisonnable"], correct: 2, explanation: "Un stop coupe la perte bien avant : dans l'exemple, à 1 % de baisse, le niveau de marge est encore à 270 %." },
  ],
  pratique: [
    { texte: "Ouvrez une position fictive de taille raisonnable, avec un stop posé avant de cliquer.", href: "/trading", bouton: "Prendre position" },
    { texte: "Notez dans votre journal la taille, le stop et la perte maximale de chaque trade.", href: "/journal", bouton: "Ouvrir le journal" },
  ],
};

export default lecon;
