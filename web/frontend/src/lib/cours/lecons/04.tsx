import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { ExplorateurRsi } from "@/components/cours/outils/ExplorateurRsi";
import { DivergenceRsi } from "@/components/cours/outils/DivergenceRsi";

// L'or, en bougies d'un jour. Une hausse, une baisse, une reprise.
const explore = serie([[0, 4000], [14, 3985], [30, 4130], [36, 4120], [50, 3950], [56, 3930], [70, 4010], [79, 4040]], { graine: 51, bruit: 0.006 });
// Une forte tendance : le RSI passe 70 tôt et y reste.
const piege = serie([[0, 3900], [12, 3930], [28, 4080], [33, 4065], [46, 4190], [51, 4175], [66, 4300], [71, 4290], [84, 4380]], { graine: 52, bruit: 0.0055 });
// Deux sommets : le second plus haut pour le prix, plus bas pour le RSI.
const divergence = serie([[0, 3900], [8, 3895], [18, 4060], [21, 4085, "haut"], [30, 4020], [38, 4060], [47, 4100], [51, 4112, "haut"], [58, 4040], [69, 3950]], { graine: 53, bruit: 0.005 });

const lecon: LeconSerie = {
  numero: 4,
  accroche: "Ce petit indicateur sous le graphique, c'est le RSI. Beaucoup de traders le lisent mal.",
  promesse: "À la fin de cette leçon, vous saurez ce que mesure le RSI, lire son échelle de 0 à 100, ce que veulent dire 70 et 30, éviter le piège du débutant, et repérer une divergence.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Ce qu'il mesure" },
      { t: "p", html: "Le <span class=\"mot\">RSI</span> (<em>Relative Strength Index</em>, l'indice de force relative) est une ligne que l'on place sous le graphique. Il a été inventé par J. Welles Wilder en 1978. Il répond à une seule question : <b>sur les dernières bougies, les hausses ont-elles été plus fortes que les baisses ?</b>" },
      { t: "p", html: "Pour cela, il regarde les <b>14 dernières bougies</b>. Pour chacune, il note de combien la clôture a monté ou baissé par rapport à la veille. Il fait la moyenne des hausses, la moyenne des baisses, et compare les deux." },
      { t: "h", texte: "Une échelle de 0 à 100" },
      {
        t: "liste",
        items: [
          "<b>Près de 100</b> : presque que des hausses. Les acheteurs dominent.",
          "<b>50</b> : l'équilibre. Les hausses et les baisses se valent.",
          "<b>Près de 0</b> : presque que des baisses. Les vendeurs dominent.",
        ],
      },
      {
        t: "exemple",
        html: "Sur les 14 dernières bougies, additionnez toutes les hausses et divisez par 14 : <b>6 $</b>. Faites de même avec les baisses : <b>2 $</b>. Le RSI se calcule ainsi : 100 × 6 ÷ (6 + 2) = <b>75</b>. Les hausses font les trois quarts du mouvement. Si les deux moyennes valaient 4 $, on aurait 100 × 4 ÷ 8 = 50, l'équilibre.",
      },
      { t: "p", html: "Une précision qui compte : la moyenne de Wilder est <b>lissée</b>. À chaque nouvelle bougie, elle garde 13 parts de l'ancienne moyenne et ajoute 1 part de la variation du jour. Le RSI change donc en douceur, et c'est ce calcul qu'utilisent les plateformes. L'outil ci-dessous fait exactement ce calcul, bougie par bougie." },
      {
        t: "outil",
        titre: "Le RSI, bougie par bougie",
        consigne: "Déplacez le curseur, ou glissez le doigt sur le graphique. La bande ambre montre les 14 dernières bougies ; dessous, leurs variations et le calcul.",
        el: <ExplorateurRsi bougies={explore} depart={31} />,
      },
      { t: "h", texte: "70 : le surachat. 30 : la survente." },
      { t: "p", html: "Deux lignes sont tracées sur le RSI. <b>Au-dessus de 70</b>, on parle de <span class=\"mot\">surachat</span> (<em>overbought</em>) : le prix est monté vite, il peut souffler. <b>En dessous de 30</b>, de <span class=\"mot\">survente</span> (<em>oversold</em>) : le prix a beaucoup baissé, un rebond devient possible." },
      {
        t: "scenes",
        titre: "Le RSI au fil du temps",
        scenes: [
          { legende: "L'or monte de 3 985 à 4 130 $ en un peu plus de deux semaines : presque chaque jour est une hausse. Le RSI grimpe à 79, <b>au-dessus de 70</b> : surachat.", cfg: { bougies: explore, panneaux: ["rsi"], jusqua: 31, surligne: [31], unite: "jour" } },
          { legende: "Puis la baisse : le RSI tombe à 22, <b>sous 30</b> : survente. Les vendeurs ont dominé.", cfg: { bougies: explore, panneaux: ["rsi"], jusqua: 52, surligne: [52], unite: "jour" } },
          { legende: "Enfin le prix se reprend, et le RSI revient autour de 55 à 60 : ni excès d'un côté, ni de l'autre.", cfg: { bougies: explore, panneaux: ["rsi"], unite: "jour" } },
        ],
      },
      { t: "p", html: "« Peut souffler », « devient possible » : ces mots sont choisis. <b>Un RSI au-dessus de 70 ne dit pas que la hausse va s'arrêter</b>. Il dit qu'elle a été forte." },
      { t: "h", texte: "Le piège du débutant : vendre dès 70" },
      { t: "p", html: "La tentation est grande : « 70, c'est trop haut, je vends ». Mais dans une <b>forte tendance</b>, le RSI peut rester au-dessus de 70 pendant des semaines, pendant que le prix continue de monter. Un RSI élevé, c'est une hausse en bonne santé, pas une hausse finie." },
      {
        t: "scenes",
        titre: "Vendre à 70 dans une tendance",
        scenes: [
          { legende: "Jour 20 : le RSI passe 70 (70,4). L'or est à 3 997 $. Un débutant vend : « c'est du surachat ».", cfg: { bougies: piege, panneaux: ["rsi"], jusqua: 19, marques: [{ i: 19, type: "vente", label: "Vente à 70" }], unite: "jour" } },
          { legende: "Trois semaines plus tard, l'or est à 4 150 $ et le RSI est toujours au-dessus de 70.", cfg: { bougies: piege, panneaux: ["rsi"], jusqua: 40, marques: [{ i: 19, type: "vente", label: "Vente à 70" }], unite: "jour" } },
          { legende: "À la fin, l'or est à <b>4 380 $</b>. Le RSI est resté au-dessus de 70 sur 49 jours des 71 où il existe. La vente « en surachat » perd 383 $ par once.", cfg: { bougies: piege, panneaux: ["rsi"], marques: [{ i: 19, type: "vente", label: "Vente à 70" }], unite: "jour" } },
        ],
      },
      { t: "piege", html: "<b>Prendre 70 et 30 pour des ordres.</b> Ce sont des zones à surveiller, pas des boutons « vendre » et « acheter ». Dans une tendance haussière, le RSI vit souvent entre 40 et 80 ; dans une baissière, entre 20 et 60. Avant de jouer contre un RSI extrême, demandez-vous d'abord : <b>dans quelle tendance suis-je ?</b>" },
      { t: "h", texte: "La divergence" },
      { t: "p", html: "Le signal le plus utile du RSI. Le prix fait un <b>sommet plus haut</b> que le précédent… mais le RSI, lui, fait un <b>sommet plus bas</b>. Le prix et l'indicateur ne disent plus la même chose : c'est une <span class=\"mot\">divergence</span>. Elle montre une hausse qui s'essouffle. Le prix monte encore, mais avec moins de force : les acheteurs s'épuisent. Une baisse peut suivre." },
      { t: "p", html: "La même chose existe à l'envers : le prix fait un creux plus bas, le RSI un creux plus haut. Les vendeurs s'épuisent, un rebond peut suivre." },
      {
        t: "outil",
        titre: "Repérez la divergence",
        consigne: "Touchez les deux sommets du prix que vous voulez comparer : le RSI de chacun s'affiche. Puis voyez la correction et la suite.",
        el: <DivergenceRsi bougies={divergence} attendus={[21, 51]} finExercice={54} />,
      },
      { t: "p", html: "Comme pour les bougies, <b>une divergence est un signal, pas une garantie</b>. Elle peut durer longtemps, et le prix peut encore monter. Attendez la <b>confirmation sur le prix</b> : une clôture sous le dernier creux, une cassure de support." },
      {
        t: "exemple",
        titre: "La divergence de l'exercice",
        html: "Premier sommet : l'or à <b>4 085 $</b>, RSI <b>83,2</b>. Second sommet : l'or à <b>4 112 $</b>, plus haut, mais le RSI à <b>70,5</b>, plus bas. Entre les deux, le plus bas creux est à 4 006,5 $. La confirmation arrive au jour 62, quand l'or clôture à 4 004 $, sous ce creux. Il finit à 3 950 $.",
      },
      { t: "h", texte: "Bien s'en servir" },
      {
        t: "liste",
        items: [
          "<b>Lisez d'abord la tendance</b>, avec le prix ou une moyenne mobile (leçon 6), puis le RSI.",
          "En tendance haussière, un RSI qui redescend vers 40 ou 50 montre un repli qui peut offrir un meilleur prix d'achat.",
          "Une <b>divergence</b> prévient ; c'est le prix qui confirme.",
          "Ne l'utilisez jamais seul : un support, une bougie de rejet, et toujours un stop (leçon 7).",
        ],
      },
      {
        t: "qr",
        items: [
          { q: "Pourquoi 14 bougies ?", r: "C'est le réglage de Wilder, et celui de presque toutes les plateformes. Comme tout le monde le regarde, il compte. Moins de bougies donne un RSI plus nerveux ; plus, un RSI plus calme." },
          { q: "Il marche sur toutes les unités de temps ?", r: "Oui : le calcul est le même sur des bougies de 5 minutes ou d'un jour. Un surachat en journalier pèse plus qu'un surachat en 5 minutes." },
          { q: "RSI à 30 : j'achète ?", r: "Pas sur ce seul chiffre. Une forte baisse peut rester sous 30 longtemps, comme une forte hausse au-dessus de 70. Cherchez un support, une bougie de rejet, ou une divergence haussière, et attendez la confirmation." },
        ],
      },
      { t: "nimbo", texte: "Sur la page Analyse, la rubrique « Les indicateurs » donne le RSI de chaque actif, avec ce qu'il dit aujourd'hui. Avant d'en tirer quoi que ce soit, regardez la tendance sur le graphique.", humeur: "pointe" },
    ],
  }],
  mots: [
    { terme: "RSI", en: "Relative Strength Index", def: "L'indice de force relative : il compare la force des hausses à celle des baisses, sur 14 bougies, de 0 à 100." },
    { terme: "Surachat", en: "overbought", def: "RSI au-dessus de 70 : le prix est monté vite, il peut souffler." },
    { terme: "Survente", en: "oversold", def: "RSI en dessous de 30 : le prix a beaucoup baissé, un rebond devient possible." },
    { terme: "Divergence", en: "divergence", def: "Le prix et le RSI vont dans deux sens différents, par exemple un sommet plus haut pour le prix, plus bas pour le RSI : le mouvement s'essouffle." },
    { terme: "Clôture", en: "close", def: "Le dernier prix d'une bougie. Le RSI compare les clôtures entre elles." },
    { terme: "Confirmation", en: "confirmation", def: "Ce que fait le prix après un signal et qui le rend crédible, comme une clôture sous le dernier creux." },
  ],
  retenir: [
    "Le <b>RSI</b> compare la force des hausses à celle des baisses, sur les 14 dernières bougies.",
    "Il va de <b>0 à 100</b> ; 50 est l'équilibre.",
    "Au-dessus de <b>70</b>, le <b>surachat</b> ; en dessous de <b>30</b>, la <b>survente</b>.",
    "Un RSI élevé dit que la hausse est <b>forte</b>, pas qu'elle va s'arrêter : ne vendez pas dès 70 en pleine tendance.",
    "Une <b>divergence</b> (sommet plus haut pour le prix, plus bas pour le RSI) montre une tendance qui s'essouffle.",
    "C'est un signal, pas une garantie : <b>attendez la confirmation</b> sur le prix.",
  ],
  quiz: [
    { question: "Que mesure le RSI ?", options: ["Le volume échangé", "La force des hausses face aux baisses, sur les dernières bougies", "Le prix moyen de la journée"], correct: 1, explanation: "Il compare la moyenne des hausses à celle des baisses, sur 14 bougies. D'où son nom : force relative." },
    { question: "La moyenne des hausses vaut 3 $, celle des baisses 1 $. Que vaut le RSI ?", options: ["75", "30", "300"], correct: 0, explanation: "100 × 3 ÷ (3 + 1) = 75. Les hausses font les trois quarts du mouvement : on est en surachat." },
    { question: "En pleine tendance haussière, le RSI passe 72. Que faire ?", options: ["Vendre tout de suite", "Rien de spécial : la hausse est forte, le RSI peut y rester longtemps", "Acheter le double"], correct: 1, explanation: "Un RSI élevé dit que la hausse est forte, pas qu'elle se termine. Vendre dès 70 en tendance est le piège du débutant." },
    { question: "Le prix fait un sommet plus haut, le RSI un sommet plus bas. C'est…", options: ["Une divergence : la hausse s'essouffle", "Une confirmation de la hausse", "Une erreur de l'indicateur"], correct: 0, explanation: "Le prix monte encore, mais avec moins de force. Une baisse peut suivre, à confirmer sur le prix." },
    { question: "Vous voyez une divergence baissière. Quelle est la bonne attitude ?", options: ["Vendre immédiatement, c'est sûr", "Attendre une confirmation sur le prix, par exemple une clôture sous le dernier creux", "L'ignorer, ça ne sert à rien"], correct: 1, explanation: "Une divergence prévient, elle ne garantit rien. Elle peut durer : c'est le prix qui confirme." },
  ],
  pratique: [
    { texte: "Regardez le RSI d'un actif sur la page Analyse, puis la tendance du graphique : se contredisent-ils ?", href: "/analysis", bouton: "Ouvrir l'analyse" },
  ],
};

export default lecon;
