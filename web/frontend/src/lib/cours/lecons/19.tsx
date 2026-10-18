import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { CalculTaille } from "@/components/cours/outils/CalculTaille";
import { RectangleRisque } from "@/components/cours/outils/RectangleRisque";
import { ExercicesTaille } from "@/components/cours/outils/ExercicesTaille";

// L'euro-dollar : un creux récent à 1,0983, un plus ancien à 1,0962 ; on achète à 1,1000.
const euro = serie([[0, 1.0930], [6, 1.0975], [12, 1.0962, "bas"], [20, 1.1025, "haut"], [27, 1.0995], [33, 1.0983, "bas"], [40, 1.1000]], { graine: 20, bruit: 0.0006 });
// L'or : un creux à 3 991, on achète à 4 000, stop à 3 990.
const or = serie([[0, 3950], [8, 3990], [14, 3992, "bas"], [22, 4030, "haut"], [30, 4005], [36, 3991, "bas"], [44, 4000]], { graine: 7, bruit: 0.0025 });

const ENTREE = { prix: 1.1, label: "Entrée 1,1000", couleur: "var(--cap-ink)", pointille: false };

const lecon: LeconSerie = {
  numero: 19,
  accroche: "Combien de lots prendre ? Trop, et un seul trade peut vous coûter très cher.",
  promesse: "À la fin de cette leçon, vous saurez calculer la taille de n'importe quelle position en trois étapes, pour ne jamais risquer plus que ce que vous avez décidé.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "La question que tout le monde se pose mal" },
      { t: "p", html: "Beaucoup de débutants choisissent leur taille au feeling : « 1 lot, ça sonne bien », « 0,50, parce que je le sens ». C'est à l'envers. La taille n'est pas un choix d'humeur : c'est <b>le résultat d'un calcul</b>. On part de ce qu'on accepte de perdre (leçon 7), on regarde où se trouve le stop, et la taille en découle. Ce calcul s'appelle le <span class=\"mot\">position sizing</span>, le dimensionnement de la position." },
      { t: "p", html: "Trop gros, et un seul trade coûte très cher : 1 lot sur l'euro-dollar, avec un stop à 20 pips, c'est 200 $ de perte, 10 % d'un compte de 2 000 $. Bien calculé, le même trade coûte 20 $." },

      { t: "h", texte: "Étape 1 : votre risque en argent" },
      { t: "p", html: "Tout commence par le <span class=\"mot\">risque par trade</span>, en dollars. Sur un compte de <b>2 000 $</b>, avec la règle du 1 % (leçon 7) : <b>20 $</b>. C'est la somme que vous perdrez si le stop est touché. Ni plus, ni moins." },
      { t: "p", html: "Gardez un compte <b>en dollars</b> quand vous tradez l'euro-dollar ou l'or : leurs gains et leurs pertes se comptent en dollars. Avec un compte en euros, il faudrait convertir à chaque calcul, et le taux de change changerait un peu le résultat. Une seule monnaie, c'est un calcul de moins et une erreur en moins." },

      { t: "h", texte: "Étape 2 : la distance de votre stop" },
      { t: "p", html: "Le <span class=\"mot\">stop loss</span> se pose <b>d'abord, sur le graphique</b>, là où votre idée devient fausse : sous le dernier creux, avec un peu de marge (leçon 7). Puis vous mesurez sa distance à l'entrée, en pips (leçon 17)." },
      {
        t: "graphique",
        cfg: { bougies: euro, niveaux: [ENTREE, { prix: 1.098, label: "Stop 1,0980 : 20 pips", couleur: "var(--cap-down)", pointille: false, epaisseur: 2 }], marques: [{ i: 40, type: "achat", label: "Achat" }, { i: 33, type: "point" }], zones: [{ i0: 33, i1: 40, p0: 1.098, p1: 1.1, couleur: "var(--cap-down)" }], unite: "heure" },
        legende: "Achat à 1,1000, dernier creux à 1,0983 : le stop va juste dessous, à 1,0980. De 1,1000 à 1,0980, il y a 20 pips.",
      },

      { t: "h", texte: "Étape 3 : ce que vaut un pip, pour un lot" },
      { t: "p", html: "Dernière pièce : la <span class=\"mot\">valeur du pip</span> (en anglais <em>pip value</em>) pour une position d'un lot. Sur l'euro-dollar, avec un compte en dollars, <b>un pip vaut 10 $ pour un lot</b> (leçon 17). Pour 0,10 lot, il vaut 1 $ ; pour 0,01 lot, 0,10 $." },

      { t: "h", texte: "Le calcul, puis la vérification" },
      {
        t: "exemple",
        html: "Un lot, avec ce stop, perdrait <b>20 pips × 10 $ = 200 $</b>. Vous acceptez de perdre 20 $. Votre taille : <b>20 $ ÷ 200 $ = 0,10 lot</b>.<br/>On vérifie toujours : à 0,10 lot, un pip vaut 1 $. Vingt pips, 20 $ : <b>1 % du compte, pile</b>.",
      },
      { t: "p", html: "La formule, si vous l'aimez écrite : <b>taille = risque ÷ (stop × valeur du pip pour un lot)</b>. Mais retenez plutôt les trois étapes, dans l'ordre : le risque, le stop, la valeur. Et la vérification à la fin, qui attrape les virgules mal placées." },
      {
        t: "outil",
        titre: "Le calculateur de taille",
        consigne: "Changez le compte, la part risquée, l'actif ou le stop : les trois étapes se refont sous vos yeux, jusqu'à la vérification.",
        el: <CalculTaille />,
      },

      { t: "h", texte: "Le stop d'abord, la taille ensuite" },
      { t: "p", html: "C'est le cœur de la méthode. Le stop se place selon le graphique, jamais selon la taille qu'on aimerait prendre. Si le bon stop est loin, <b>la taille baisse</b> ; s'il est proche, <b>elle monte</b>. Le risque, lui, <b>ne bouge pas</b>." },
      {
        t: "scenes",
        titre: "Deux stops, le même risque",
        scenes: [
          { legende: "Vous achetez à 1,1000.", cfg: { bougies: euro, niveaux: [ENTREE], marques: [{ i: 40, type: "achat", label: "Achat" }], unite: "heure" } },
          { legende: "Stop sous le dernier creux, à 1,0980 : <b>20 pips</b>. Un lot perdrait 200 $. Taille : 20 $ ÷ 200 $ = <b>0,10 lot</b>.", cfg: { bougies: euro, niveaux: [ENTREE, { prix: 1.098, label: "Stop 20 pips : 0,10 lot", couleur: "var(--cap-down)", pointille: false, epaisseur: 2 }], marques: [{ i: 40, type: "achat", label: "Achat" }, { i: 33, type: "point" }], unite: "heure" } },
          { legende: "Si votre idée exige un stop sous le creux plus ancien, à 1,0960 : <b>40 pips</b>. Un lot perdrait 400 $. Taille : 20 $ ÷ 400 $ = <b>0,05 lot</b>.", cfg: { bougies: euro, niveaux: [ENTREE, { prix: 1.098, label: "20 pips : 0,10 lot", couleur: "var(--cap-ink-3)" }, { prix: 1.096, label: "Stop 40 pips : 0,05 lot", couleur: "var(--cap-down)", pointille: false, epaisseur: 2 }], marques: [{ i: 40, type: "achat", label: "Achat" }, { i: 12, type: "point" }], unite: "heure" } },
          { legende: "Stop deux fois plus loin, taille deux fois plus petite : <b>20 $ de risque dans les deux cas</b>.", cfg: { bougies: euro, niveaux: [ENTREE, { prix: 1.098, label: "20 pips × 0,10 lot = 20 $", couleur: "var(--cap-down)" }, { prix: 1.096, label: "40 pips × 0,05 lot = 20 $", couleur: "var(--cap-down)" }], zones: [{ i0: 33, i1: 40, p0: 1.096, p1: 1.1, couleur: "var(--cap-down)" }], unite: "heure" } },
        ],
      },
      {
        t: "outil",
        titre: "Le risque est un rectangle",
        consigne: "La hauteur est le stop, la largeur la taille, l'aire le risque en dollars. Allongez le stop avec la bonne méthode, puis à taille fixe, et regardez l'aire.",
        el: <RectangleRisque risque={20} />,
      },

      { t: "h", texte: "Sur l'or, la même méthode" },
      { t: "p", html: "Rien ne change, sauf l'étape 3. Sur l'or, un lot vaut <b>100 onces</b> : quand l'once bouge de 1 $, un lot gagne ou perd <b>100 $</b>. On mesure donc le stop en dollars de prix." },
      {
        t: "graphique",
        cfg: { bougies: or, niveaux: [{ prix: 4000, label: "Entrée 4 000", couleur: "var(--cap-ink)", pointille: false }, { prix: 3990, label: "Stop 3 990 : 10 $", couleur: "var(--cap-down)", pointille: false, epaisseur: 2 }], marques: [{ i: 44, type: "achat", label: "Achat" }, { i: 36, type: "point" }], unite: "heure" },
        legende: "L'or acheté à 4 000 $, le stop sous le creux de 3 991, à 3 990 : 10 $ de distance.",
      },
      {
        t: "exemple",
        html: "Risque : <b>20 $</b>. Stop : <b>10 $</b> sous l'entrée. Un lot perdrait 10 × 100 $ = <b>1 000 $</b>. Taille : 20 $ ÷ 1 000 $ = <b>0,02 lot</b>.<br/>Vérification : à 0,02 lot (2 onces), 1 $ de mouvement vaut 2 $ ; 10 $ de stop, 20 $. Pile 1 %.",
      },

      { t: "h", texte: "Entre deux tailles, toujours vers le bas" },
      { t: "p", html: "Les tailles se donnent au centième de lot : 0,12, 0,13, jamais 0,125. Quand le calcul tombe entre deux, on <span class=\"mot\">arrondit vers le bas</span> (<em>round down</em>) : on reste sous son risque, jamais au-dessus." },
      {
        t: "exemple",
        html: "Stop à <b>16 pips</b> sur l'euro-dollar : un lot perdrait 160 $. 20 $ ÷ 160 $ = <b>0,125</b>. Vers le bas : <b>0,12 lot</b>. Vérification : 16 pips × 1,20 $ = 19,20 $, un peu moins de 20 $. Arrondi à 0,13, vous risqueriez 20,80 $.",
      },
      { t: "p", html: "Et si le calcul tombe sous 0,01 lot, la plus petite taille possible ? Par exemple un stop de 25 $ sur l'or : 20 $ ÷ 2 500 $ = 0,008 lot. Même 0,01 lot risquerait 25 $. Ce trade est trop gros pour le compte : <b>on passe son tour</b>. On ne rapproche pas le stop pour faire entrer la taille, il ne serait plus là où l'idée devient fausse." },
      {
        t: "outil",
        titre: "Cinq calculs à faire",
        consigne: "Écrivez votre taille (par exemple 0,10), vérifiez, puis lisez la correction.",
        el: <ExercicesTaille />,
      },

      { t: "piege", html: "<b>Choisir la taille d'abord, puis caser le stop.</b> « Je veux 0,20 lot, donc mon stop sera à 10 pips. » Le stop se retrouve n'importe où, souvent trop près, et saute au premier mouvement. L'ordre est toujours le même : <b>le stop sur le graphique, puis la taille</b>. Et le levier (leçon 18) ne change rien à ce calcul : il dit ce que vous pouvez ouvrir, pas ce que vous devez risquer." },
      {
        t: "qr", items: [
          { q: "Faut-il refaire le calcul à chaque trade ?", r: "Oui, parce que le stop change à chaque trade. Le risque (20 $) reste le même tant que le compte ne bouge pas beaucoup ; la distance du stop, elle, change tout le temps. Dix secondes de calcul." },
          { q: "Et quand le compte grandit ou baisse ?", r: "Recalculez le risque de temps en temps : 1 % de 2 200 $, c'est 22 $ ; 1 % de 1 800 $, 18 $. Après une série de pertes, le risque en dollars baisse tout seul, et c'est une bonne chose." },
          { q: "Mon compte est en euros. Comment faire ?", r: "Convertissez votre risque en dollars avant le calcul : avec l'euro à 1,1000, 20 € valent 22 $. Puis faites les trois étapes en dollars. C'est faisable, mais un compte en dollars évite cette étape." },
          { q: "Les frais comptent-ils dans le risque ?", r: "Un peu : le spread (leçon 16), la commission et le swap (leçon 21) s'ajoutent à la perte du stop. Pour être exact, gardez une petite marge, ou retirez les frais prévus du risque avant de diviser." },
        ],
      },
      { t: "nimbo", texte: "Sur la page Trading, posez votre stop et choisissez votre part de risque : je calcule la taille pour vous et j'affiche ce que coûterait le stop. Refaites le calcul de tête pour vérifier, c'est le meilleur entraînement.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Taille de position", en: "position sizing", def: "Le calcul du nombre de lots à prendre pour que le stop coûte exactement le risque choisi." },
    { terme: "Risque par trade", en: "risk per trade", def: "Ce que vous perdez si le stop est touché, en argent : 1 % de 2 000 $, soit 20 $." },
    { terme: "Stop loss", en: "stop loss", def: "L'ordre qui ferme la position si le prix va contre vous. On le place d'abord, et sa distance donne la taille." },
    { terme: "Valeur du pip", en: "pip value", def: "Ce que rapporte ou coûte un pip pour une taille donnée : 10 $ pour un lot sur l'euro-dollar." },
    { terme: "Arrondir vers le bas", en: "round down", def: "Garder le centième de lot inférieur quand le calcul tombe entre deux tailles : 0,125 devient 0,12." },
  ],
  retenir: [
    "La taille est <b>le résultat d'un calcul</b>, pas une envie.",
    "Trois étapes : <b>le risque en argent</b> (20 $), <b>le stop en pips</b> (20), <b>la valeur du pip pour un lot</b> (10 $).",
    "Taille = risque ÷ (stop × valeur) : 20 $ ÷ 200 $ = <b>0,10 lot</b>. Puis on <b>vérifie</b> : 20 pips × 1 $ = 20 $.",
    "<b>Le stop d'abord</b> : plus loin, la taille baisse ; plus près, elle monte ; le risque ne bouge pas.",
    "Sur l'or, un lot vaut 100 onces : un stop à 10 $, c'est 1 000 $ par lot, donc <b>0,02 lot</b>.",
    "Entre deux tailles, <b>toujours vers le bas</b> : 0,125 devient 0,12.",
  ],
  quiz: [
    { question: "Compte de 2 000 $, risque de 1 %, stop à 20 pips sur l'euro-dollar. Quelle taille ?", options: ["1 lot", "0,10 lot", "0,01 lot"], correct: 1, explanation: "20 pips × 10 $ = 200 $ par lot ; 20 $ ÷ 200 $ = 0,10 lot. Vérification : 20 pips × 1 $ = 20 $." },
    { question: "Votre stop doit être deux fois plus loin que prévu. Que faites-vous ?", options: ["Je garde la même taille", "Je divise la taille par deux", "Je rapproche le stop"], correct: 1, explanation: "Stop deux fois plus loin, taille deux fois plus petite : le risque reste le même. Le stop reste là où l'idée devient fausse." },
    { question: "Sur l'or, stop à 10 $, risque de 20 $. Quelle taille ?", options: ["0,02 lot", "0,20 lot", "2 lots"], correct: 0, explanation: "Un lot (100 onces) perdrait 10 × 100 $ = 1 000 $. 20 $ ÷ 1 000 $ = 0,02 lot." },
    { question: "Le calcul donne 0,125 lot. Que prenez-vous ?", options: ["0,13 lot", "0,12 lot", "0,125 lot"], correct: 1, explanation: "On arrondit toujours vers le bas pour rester sous son risque : 0,12 lot risque 19,20 $, 0,13 en risquerait 20,80 $." },
    { question: "Dans quel ordre faire les choses ?", options: ["La taille, puis le stop", "Le stop sur le graphique, puis la taille", "Le levier, puis la taille"], correct: 1, explanation: "Le stop se place là où l'idée devient fausse. Sa distance, avec le risque choisi, donne la taille." },
  ],
  pratique: [
    { texte: "Posez un stop sur un trade fictif et laissez la page calculer la taille. Refaites le calcul de tête.", href: "/trading", bouton: "Prendre position" },
    { texte: "Notez dans votre journal la taille et le risque de chaque trade.", href: "/journal", bouton: "Ouvrir le journal" },
  ],
};

export default lecon;
