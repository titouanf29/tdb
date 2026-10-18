import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { CalculLevier } from "@/components/cours/outils/CalculLevier";

// L'euro-dollar recule de 1 % : de 1,1000 à 1,0890, 110 pips.
const unPourcent = serie([[0, 1.1018], [5, 1.1, "haut"], [12, 1.0972], [18, 1.0985], [26, 1.0935], [32, 1.0948], [40, 1.089, "bas"], [44, 1.0902]], { graine: 181, bruit: 0.0006 });

const lecon: LeconSerie = {
  numero: 18,
  accroche: "Avec 1 000 €, vous pouvez ouvrir une position de 30 000 €. C'est l'effet de levier. Mais que change-t-il vraiment ?",
  promesse: "À la fin de cette leçon, vous saurez ce qu'est le levier, ce que la plateforme bloque (la marge), ce que le levier change et ce qu'il ne change pas, et pourquoi la bonne taille ne se choisit jamais avec le levier maximum.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Le levier : ouvrir plus gros que son argent" },
      { t: "p", html: "L'<span class=\"mot\">effet de levier</span> (<em>leverage</em>), c'est votre courtier qui vous laisse ouvrir <b>une position plus grosse que votre argent</b>. Avec un levier de 30, chaque euro de votre compte en ouvre trente : <b>1 000 € ouvrent 30 000 €</b>." },
      { t: "p", html: "Ce que le courtier met de côté sur votre compte pendant que la position est ouverte, c'est la <span class=\"mot\">marge</span> (<em>margin</em>) : une sorte de caution. Ici, 30 000 € ÷ 30 = <b>1 000 €</b> bloqués. Mais attention : <b>vos gains et vos pertes se comptent sur les 30 000 €</b>, pas sur les 1 000." },
      { t: "exemple", html: "Un compte de <b>1 000 €</b>, un levier de <b>30</b>. Vous ouvrez 30 000 € sur l'euro-dollar, soit <b>0,30 lot</b> (un lot, ce sont 100 000 €, leçon 17). La plateforme bloque 1 000 € de marge. Si l'euro-dollar monte de 1 %, vous gagnez 1 % de 30 000 €, soit <b>300 €</b>. S'il baisse de 1 %, vous perdez 300 €." },

      { t: "h", texte: "En Europe, il est plafonné" },
      { t: "p", html: "Pour un particulier, l'autorité européenne des marchés (l'ESMA) a fixé un <span class=\"mot\">levier maximum</span> (<em>max leverage</em>), selon l'actif :" },
      {
        t: "tableau",
        entetes: ["L'actif", "Levier maximum (particulier, Europe)", "Marge minimum"],
        lignes: [
          ["Grandes paires du forex (euro-dollar, dollar-yen…)", "<b>30</b>", "3,33 % de la position"],
          ["Or, autres paires, grands indices", "<b>20</b>", "5 %"],
          ["Matières premières (hors or), petits indices", "10", "10 %"],
          ["Actions", "5", "20 %"],
          ["Cryptomonnaies", "<b>2</b>", "50 %"],
        ],
        legende: "Des sites hors d'Europe proposent 100, 500, plus encore. C'est précisément le danger que ces plafonds veulent limiter.",
      },

      { t: "h", texte: "Ce que le levier ne change pas : la valeur du pip" },
      { t: "p", html: "C'est l'idée la plus importante de la leçon. La valeur d'un pip dépend <b>seulement de la taille de votre position</b> (leçon 17) : 0,10 lot sur l'euro-dollar, c'est 1 $ par pip, avec un levier de 1, de 10 ou de 30. Le levier ne change ni vos gains ni vos pertes pour une taille donnée." },
      { t: "p", html: "Ce qu'il change, c'est la marge bloquée : 0,10 lot (10 000 €) bloque 10 000 € sans levier, 1 000 € avec un levier de 10, <b>333 €</b> avec un levier de 30." },
      {
        t: "tableau",
        entetes: ["0,10 lot sur l'euro-dollar", "Levier 1", "Levier 10", "Levier 30"],
        lignes: [
          ["Marge bloquée", "10 000 €", "1 000 €", "333 €"],
          ["Valeur d'un pip", "<b>1 $</b>", "<b>1 $</b>", "<b>1 $</b>"],
          ["Un stop de 20 pips", "20 $", "20 $", "20 $"],
        ],
        legende: "Même taille, même risque : le levier ne change que l'argent mis de côté.",
      },

      { t: "h", texte: "Ce qu'il change : la taille que vous pouvez ouvrir" },
      { t: "p", html: "Le levier vous <b>permet</b> d'ouvrir plus gros. Et c'est là le piège : la tentation de se servir de tout ce qui est permis. Avec 1 000 € et tout le levier, vous tenez 30 000 €. Un mouvement de 1 % contre vous, c'est 300 € : <b>30 % de votre compte</b>, sur un mouvement banal." },
      {
        t: "scenes",
        titre: "1 % contre vous, avec tout le levier",
        scenes: [
          { legende: "Vous achetez 0,30 lot d'euro-dollar à 1,1000 : 30 000 € avec un compte de 1 000 €.", cfg: { bougies: unPourcent, jusqua: 5, marques: [{ i: 5, type: "achat", prix: 1.1 }], niveaux: [{ prix: 1.1, label: "Achat 1,1000", couleur: "var(--cap-ink)" }], unite: "heure" } },
          { legende: "Le prix recule. Rien d'extraordinaire : une journée agitée.", cfg: { bougies: unPourcent, jusqua: 26, marques: [{ i: 5, type: "achat", prix: 1.1 }], niveaux: [{ prix: 1.1, label: "Achat 1,1000", couleur: "var(--cap-ink)" }], unite: "heure" } },
          { legende: "Il arrive à 1,0890 : <b>1 % de baisse</b>, 110 pips. Avec 0,30 lot (3 $ par pip), environ 330 $, soit <b>300 €</b> : 30 % du compte.", cfg: { bougies: unPourcent, marques: [{ i: 5, type: "achat", prix: 1.1 }, { i: 40, type: "point" }], niveaux: [{ prix: 1.1, label: "Achat 1,1000", couleur: "var(--cap-ink)" }, { prix: 1.089, label: "1,0890 : moins 1 %, moins 300 €", couleur: "var(--cap-down)" }], unite: "heure" } },
        ],
      },
      {
        t: "outil",
        titre: "Le levier, la taille, la marge",
        consigne: "Réglez votre capital et votre taille. Changez ensuite le levier sans toucher à la taille : regardez ce qui bouge, et ce qui ne bouge pas. Puis prenez tout le levier.",
        el: <CalculLevier />,
      },
      { t: "p", html: "Une précision pour les calculs : sur l'euro-dollar, la position se compte en euros (100 000 € par lot) et le pip se paie en dollars (10 $ par lot). Votre plateforme convertit tout dans la monnaie de votre compte." },

      { t: "h", texte: "L'appel de marge, puis la clôture forcée" },
      { t: "p", html: "Quand une position perd, la perte est prise sur l'argent de votre compte qui n'est pas bloqué. Si les pertes mangent cet argent et commencent à menacer la marge, le courtier vous prévient : c'est l'<span class=\"mot\">appel de marge</span> (<em>margin call</em>). Vous ne pouvez plus ouvrir de position." },
      { t: "p", html: "Si la perte continue, il ferme vos positions lui-même, au prix du moment, pour que vous ne perdiez pas plus que votre compte : c'est la <span class=\"mot\">clôture forcée</span> (<em>stop out</em>). En Europe, pour un particulier, elle intervient au plus tard quand ce qui reste ne couvre plus que la moitié de la marge. La leçon 36 suit un compte de 1 000 €, chiffre par chiffre, jusqu'à ce moment." },
      { t: "piege", html: "<b>Prendre tout le levier parce qu'il est disponible.</b> Avec la marge qui occupe tout le compte, le moindre recul déclenche l'appel de marge, et un mouvement de moins de 2 % contre vous suffit à déclencher la clôture forcée. Le levier maximum est une limite, pas une recommandation." },

      { t: "h", texte: "La bonne taille se choisit avec le stop, pas avec le levier" },
      { t: "p", html: "La bonne question n'est pas « combien puis-je ouvrir ? », mais « <b>combien suis-je prêt à perdre si mon stop est touché ?</b> ». On part du risque accepté et de la distance du stop, et on en déduit la taille : c'est le <span class=\"mot\">calcul de la taille de position</span> (<em>position sizing</em>), la leçon 19." },
      { t: "exemple", html: "Un compte de <b>2 000 $</b>, 1 % de risque : <b>20 $</b>. Le stop est à <b>20 pips</b>. Il faut donc 1 $ par pip, soit <b>0,10 lot</b>. Avec un levier de 30, la marge bloquée est d'environ 333 € (10 000 € ÷ 30), une petite partie du compte. Vous auriez pu ouvrir bien plus : vous ne le faites pas, et c'est ce qui protège le compte." },
      { t: "qr", items: [
        { q: "Si le levier ne change pas le risque, pourquoi est-il dangereux ?", r: "Parce qu'il permet d'ouvrir une taille que votre compte ne pourrait pas porter sans lui. Sans levier, avec 1 000 €, vous ne pourriez pas ouvrir 30 000 €. Le danger n'est pas le levier lui-même, c'est la taille qu'il autorise." },
        { q: "Un levier plus faible me protège-t-il ?", r: "Il vous empêche d'ouvrir trop gros, ce qui est déjà beaucoup. Mais à taille égale, le risque est le même. La vraie protection, c'est une taille calculée et un stop posé à l'avance." },
        { q: "Puis-je perdre plus que mon compte ?", r: "En Europe, pour un particulier sur des CFD, non : la protection contre le solde négatif l'interdit. Mais perdre tout son compte reste tout à fait possible, et c'est déjà beaucoup trop." },
      ] },
      { t: "nimbo", texte: "Sur la page Trading, vous choisissez le levier de votre position fictive. Essayez la même taille avec deux leviers différents : la perte sur un même mouvement est identique.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "Effet de levier", en: "leverage", def: "La possibilité d'ouvrir une position plus grosse que l'argent du compte." },
    { terme: "Marge", en: "margin", def: "La part du compte bloquée par le courtier pour tenir une position : la taille divisée par le levier." },
    { terme: "Levier maximum", en: "max leverage", def: "Le plafond fixé pour un particulier en Europe : 30 sur les grandes paires, 20 sur l'or, 2 sur les cryptos." },
    { terme: "Taille de position", en: "position size", def: "Le nombre de lots ouverts : c'est elle qui fait le risque, pas le levier." },
    { terme: "Appel de marge", en: "margin call", def: "L'alerte du courtier quand les pertes mangent l'argent libre du compte." },
    { terme: "Clôture forcée", en: "stop out", def: "La fermeture des positions par le courtier quand le compte ne couvre plus assez la marge." },
    { terme: "Calcul de la taille", en: "position sizing", def: "Choisir sa taille à partir du risque accepté et de la distance du stop." },
  ],
  retenir: [
    "Le levier vous laisse ouvrir <b>plus gros que votre argent</b> : avec un levier de 30, 1 000 € en ouvrent 30 000.",
    "La <b>marge</b> est ce que la plateforme bloque ; les gains et les pertes se comptent sur <b>toute la position</b>.",
    "En Europe, un particulier est plafonné : <b>30</b> sur les grandes paires, <b>20</b> sur l'or, 2 sur les cryptos.",
    "Le levier <b>ne change pas la valeur du pip</b> : elle dépend seulement de la taille.",
    "Avec tout le levier, <b>1 % contre vous, c'est 30 % du compte</b> ; puis viennent l'appel de marge et la clôture forcée.",
    "La bonne taille se choisit avec son stop et son risque, <b>jamais avec le levier maximum</b>.",
  ],
  quiz: [
    { question: "Avec 1 000 € et un levier de 30, quelle position pouvez-vous ouvrir au maximum ?", options: ["1 030 €", "30 000 €", "3 000 €"], correct: 1, explanation: "Avec un levier de 30, chaque euro en ouvre trente : 1 000 × 30 = 30 000 €." },
    { question: "Vous ouvrez 0,10 lot d'euro-dollar. Vous passez le levier de 10 à 30. Que devient la valeur du pip ?", options: ["Elle triple", "Elle ne change pas : 1 $", "Elle est divisée par trois"], correct: 1, explanation: "La valeur du pip dépend seulement de la taille. Le levier ne change que la marge bloquée." },
    { question: "30 000 € ouverts avec un compte de 1 000 €. Le prix va de 1 % contre vous. Que perdez-vous ?", options: ["10 €", "300 €, soit 30 % du compte", "1 000 €"], correct: 1, explanation: "La perte se compte sur toute la position : 1 % de 30 000 €, soit 300 €, presque un tiers du compte." },
    { question: "Quel est le levier maximum pour un particulier, en Europe, sur l'or ?", options: ["20", "30", "100"], correct: 0, explanation: "30 sur les grandes paires du forex, 20 sur l'or et les grands indices, 2 sur les cryptos." },
    { question: "Comment choisir la taille de sa position ?", options: ["Avec le levier maximum disponible", "Avec la distance de son stop loss et le risque accepté", "Au hasard, puis ajuster"], correct: 1, explanation: "On part de ce qu'on accepte de perdre et de la distance du stop, et on en déduit la taille. C'est la leçon 19." },
  ],
  pratique: [
    { texte: "Ouvrez une position fictive avec deux leviers différents, à taille égale, et comparez.", href: "/trading", bouton: "Prendre position" },
    { texte: "Retrouvez le levier, la marge et l'appel de marge dans le glossaire.", href: "/learn/glossaire", bouton: "Ouvrir le glossaire" },
  ],
};

export default lecon;
