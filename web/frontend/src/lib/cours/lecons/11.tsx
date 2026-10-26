import { serie } from "../marche";
import type { LeconSerie } from "../types";
import { JaugeEmotions } from "@/components/cours/outils/JaugeEmotions";
import { SeanceTrader } from "@/components/cours/outils/SeanceTrader";
import { BarometreTrader } from "@/components/cours/outils/BarometreTrader";

// Une action d'exemple, qui monte fort puis rechute : le terrain de l'avidité et de la peur.
const emotions = serie([[0, 90], [8, 93], [14, 98], [20, 106], [25, 116], [29, 124], [31, 128, "haut"], [34, 121], [37, 110], [40, 101], [43, 96, "bas"], [47, 101], [52, 108], [58, 114]], { graine: 121, bruit: 0.009, meche: 0.6 });
// L'euro-dollar qui s'envole, puis revient : le FOMO.
const fomo = serie([[0, 1.1000], [8, 1.1004], [12, 1.1008], [14, 1.1028], [16, 1.1046], [17, 1.1052, "haut"], [19, 1.1036], [22, 1.1022], [25, 1.1014, "bas"], [28, 1.1030], [32, 1.1046], [36, 1.1062]], { graine: 122, bruit: 0.0003, meche: 0.7 });
const ach = fomo[17].c;
const R = "var(--cap-down)", V = "var(--cap-up)";

const lecon: LeconSerie = {
  numero: 11,
  accroche: "Vous achetez tout en haut, et vous revendez tout en bas ? Ce n'est pas de la malchance.",
  promesse: "À la fin de cette leçon, vous saurez reconnaître les émotions qui décident à votre place (l'avidité, la peur, le FOMO, la revanche, l'ennui) et vous aurez les deux outils qui les tiennent à distance : un plan écrit avant, un journal relu après.",
  parties: [
    {
      titre: "L'avidité, la peur, le FOMO",
      blocs: [
        { t: "h", texte: "Deux émotions qui décident à votre place" },
        { t: "p", html: "Quand on débute, on croit que le trading est une affaire de graphiques et d'indicateurs. C'est vrai à moitié. L'autre moitié se passe entre vos deux oreilles : <b>deux émotions</b> reviennent sans cesse, et si vous ne les connaissez pas, elles prennent les décisions à votre place." },
        { t: "p", html: "La première est l'<span class=\"mot\">avidité</span> (<em>greed</em>) : en vouloir toujours plus. La seconde est la <span class=\"mot\">peur</span> (<em>fear</em>) : vouloir que ça s'arrête. Elles ne sont pas des défauts : tout le monde les ressent, les professionnels aussi. La différence, c'est que les professionnels ont prévu ce qu'ils feront <b>avant</b> qu'elles arrivent." },
        { t: "h", texte: "Quand le prix monte : l'avidité" },
        { t: "p", html: "Le prix monte depuis des jours. Vous regardez, vous calculez ce que vous auriez gagné. Plus il monte, plus l'envie grandit, et c'est souvent <b>tout en haut</b>, quand la hausse est la plus spectaculaire et que tout le monde en parle, que vous finissez par acheter." },
        { t: "h", texte: "Quand il baisse : la peur" },
        { t: "p", html: "Puis le prix se retourne. Au début, vous espérez. Puis la perte grandit, et la peur prend le dessus : vous vendez pour que ça s'arrête, n'importe quel prix. Souvent <b>tout en bas</b>, juste avant que le prix ne reparte." },
        {
          t: "scenes",
          titre: "Acheter cher, revendre moins cher",
          scenes: [
            { legende: "Le prix monte lentement. Personne n'y fait attention.", cfg: { bougies: emotions, type: "ligne", jusqua: 18, unite: "jour" } },
            { legende: "La hausse s'accélère. On en parle partout, et l'<b>avidité</b> fait acheter, ici, presque au sommet.", cfg: { bougies: emotions, type: "ligne", jusqua: 31, unite: "jour", marques: [{ i: 31, type: "achat", prix: emotions[31].c, label: "L'avidité achète" }] } },
            { legende: "Le prix se retourne. On espère, puis la <b>peur</b> fait vendre, ici, presque au plus bas.", cfg: { bougies: emotions, type: "ligne", jusqua: 43, unite: "jour", marques: [{ i: 31, type: "achat", prix: emotions[31].c, label: "L'avidité achète" }, { i: 43, type: "vente", prix: emotions[43].c, label: "La peur vend" }] } },
            { legende: "Puis le prix repart, sans vous. <b>Acheter cher, revendre moins cher</b> (<em>buy high, sell low</em>) : ce ne sont pas les chiffres qui ont décidé, ce sont vos émotions.", cfg: { bougies: emotions, type: "ligne", unite: "jour", marques: [{ i: 31, type: "achat", prix: emotions[31].c, label: "L'avidité achète" }, { i: 43, type: "vente", prix: emotions[43].c, label: "La peur vend" }] } },
          ],
        },
        { t: "p", html: "C'est le contraire exact de ce qu'il faudrait faire. Les traders anglophones résument ce piège en quatre mots : <span class=\"mot\">buy high, sell low</span>, acheter haut et vendre bas. Personne ne le fait exprès. On le fait parce que l'émotion est la plus forte au pire moment : l'avidité au sommet, la peur au creux." },
        {
          t: "outil",
          titre: "La jauge des émotions",
          consigne: "Faites avancer le temps avec le curseur. L'aiguille suit ce que ressent celui qui regarde ce cours : la peur à gauche, l'avidité à droite. Puis regardez ce que ses émotions lui ont fait faire.",
          el: <JaugeEmotions bougies={emotions} />,
        },
        { t: "h", texte: "Le FOMO : la peur de rater le train" },
        { t: "p", html: "Il y a pire encore. Le prix s'envole, très vite, et vous n'êtes pas dedans. Vous avez peur de rater le train : c'est le <span class=\"mot\">FOMO</span>, de l'anglais <em>fear of missing out</em>, la peur de passer à côté. Alors vous sautez dedans, <b>sans plan</b> : pas de stop, pas d'objectif, juste l'envie d'en être." },
        { t: "p", html: "Le problème, c'est le moment. Quand une hausse est devenue assez spectaculaire pour vous donner le FOMO, elle l'a aussi donné à beaucoup d'autres, et la plupart des acheteurs sont déjà entrés. Il en reste peu pour pousser le prix plus haut. <b>Souvent, le prix redescend juste après.</b>" },
        {
          t: "scenes",
          titre: "Le train qui part, et le suivant",
          scenes: [
            { legende: "L'euro-dollar tourne autour de 1,1000. Rien à signaler.", cfg: { bougies: fomo, jusqua: 12, unite: "quart d'heure" } },
            { legende: "Soudain, il monte de 40 pips en quelques bougies. Le train part, sans vous.", cfg: { bougies: fomo, jusqua: 16, unite: "quart d'heure" } },
            { legende: "Le FOMO l'emporte : vous achetez, sans plan, presque au sommet.", cfg: { bougies: fomo, jusqua: 17, unite: "quart d'heure", marques: [{ i: 17, type: "achat", prix: ach, label: "FOMO" }] } },
            { legende: "Le prix redescend de plus de 30 pips. Sans stop, vous subissez, puis vous coupez dans la peur.", cfg: { bougies: fomo, jusqua: 25, unite: "quart d'heure", niveaux: [{ prix: ach, label: "Votre achat", couleur: R }], marques: [{ i: 17, type: "achat", prix: ach, label: "FOMO" }, { i: 24, type: "vente", prix: fomo[24].c, label: "Peur" }] } },
            { legende: "Et pourtant, un autre train passait : le prix revient calmement sur 1,1015 et repart. Celui qui avait laissé partir le premier pouvait prendre celui-ci, <b>avec un plan</b> (c'est le pullback, leçon 31).", cfg: { bougies: fomo, unite: "quart d'heure", marques: [{ i: 17, type: "achat", prix: ach, label: "FOMO" }, { i: 25, type: "achat", prix: fomo[25].c, label: "Avec un plan" }], zones: [{ i0: 23, i1: 27, p0: 1.1010, p1: 1.1020, couleur: V }] } },
          ],
        },
        { t: "h", texte: "Le remède : laisser partir le train" },
        { t: "p", html: "Le remède tient en une phrase : <b>un train parti, on le laisse partir. Il y en aura d'autres.</b> Le marché ouvre tous les jours, cinq jours par semaine, sur des dizaines d'actifs. Les occasions ne manquent jamais ; ce qui manque, c'est la patience d'attendre celles qui entrent dans votre plan." },
        {
          t: "liste", items: [
            "Avant d'entrer, posez-vous une question : <b>est-ce un setup de mon plan, ou est-ce que j'ai peur de rater quelque chose ?</b>",
            "Si vous ne savez pas où mettre votre stop, vous n'avez pas de plan : n'entrez pas.",
            "Notez les trains ratés dans votre journal : vous verrez qu'il en repasse, souvent dans la même semaine.",
          ],
        },
        {
          t: "qr", items: [
            { q: "Mais si le prix continue de monter sans moi ?", r: "Ça arrive, et ce n'est pas grave. Vous n'avez rien perdu : vous n'avez simplement pas gagné sur ce mouvement-là. Une perte évitée vaut autant qu'un gain, et vous gardez votre capital et votre calme pour la prochaine occasion." },
            { q: "Les professionnels ne ressentent rien ?", r: "Si. Ils ressentent la même peur et la même avidité. Ce qui change, c'est qu'ils ont décidé à l'avance de leur entrée, de leur sortie et de leur risque, et qu'ils s'y tiennent même quand l'émotion pousse dans l'autre sens." },
          ],
        },
        { t: "piege", html: "<b>Confondre conviction et émotion.</b> « Je le sens bien » n'est pas une raison d'entrer. Une bonne raison s'écrit en une phrase et se vérifie sur le graphique : « le prix revient sur le support et une bougie le rejette ». Si votre raison ne s'écrit pas, c'est probablement une émotion." },
      ],
    },
    {
      titre: "La revanche, l'overtrading, le plan, le journal",
      blocs: [
        { t: "h", texte: "La revanche : vouloir se refaire" },
        { t: "p", html: "Vous venez de perdre. Ça fait mal, et une idée s'impose : reprendre <b>tout de suite</b> un trade, <b>plus gros</b>, pour effacer la perte. C'est le <span class=\"mot\">revenge trading</span>, le trading de revanche. On ne suit plus son plan, on suit sa colère. Et souvent, la perte grandit." },
        {
          t: "exemple",
          titre: "La spirale de la revanche",
          html: "Compte de <b>2 000 $</b>, risque prévu de <b>1 %</b>, soit 20 $ par trade (0,10 lot sur l'euro-dollar, stop de 20 pips : 1 pip vaut 1 $). Premier trade, le stop est touché : <b>−20 $</b>. C'était prévu. Furieux, vous reprenez aussitôt, sans setup, en <b>0,30 lot</b> : 1 pip vaut maintenant 3 $. Le prix recule de 20 pips : <b>−60 $</b>. Vous doublez encore, 0,60 lot : 20 pips de plus contre vous, <b>−120 $</b>. En trois trades, vous avez perdu <b>200 $</b>, 10 % du compte, au lieu des 20 $ prévus. Pour revenir à 2 000 $, il faut maintenant gagner 200 $ sur 1 800 $, soit plus de 11 %.",
        },
        {
          t: "tableau",
          entetes: ["Trade", "Taille", "Perte", "Perte cumulée", "Part du compte"],
          lignes: [
            ["1, prévu par le plan", "0,10 lot", "−20 $", "−20 $", "1 %"],
            ["2, revanche", "0,30 lot", "−60 $", "−80 $", "4 %"],
            ["3, revanche", "0,60 lot", "−120 $", "−200 $", "10 %"],
          ],
          legende: "Chaque perte de 20 pips coûte de plus en plus cher : c'est la taille, pas le marché, qui fait la spirale.",
        },
        { t: "p", html: "Le remède est simple à dire, plus dur à faire : <b>après une perte, une pause, jamais un trade plus gros.</b> Certains traders se fixent une règle écrite : deux pertes dans la journée, et on ferme la plateforme jusqu'au lendemain." },
        { t: "h", texte: "L'overtrading : trop de trades" },
        { t: "p", html: "L'autre piège est plus discret : trader trop. C'est l'<span class=\"mot\">overtrading</span>. On prend des trades par ennui, pour « être dans le marché », ou pour rattraper une journée. Chaque trade a pourtant un coût, même quand il ne gagne ni ne perd : le <span class=\"mot\">spread</span>, l'écart entre le prix d'achat et le prix de vente (leçon 16)." },
        {
          t: "exemple",
          html: "Sur l'euro-dollar, avec un spread de 1 pip et 0,10 lot, chaque trade coûte <b>1 $</b> dès l'entrée. Vingt trades par jour, c'est <b>20 $</b> de spread, soit 1 % d'un compte de 2 000 $, chaque jour, avant même de savoir si vos trades sont bons. Sur un mois de vingt jours de bourse, 400 $ : un cinquième du compte, parti en frais. Et plus on enchaîne les trades, plus la <b>fatigue</b> fait faire des erreurs : un stop oublié, une taille mal tapée, un setup vu là où il n'y en a pas.",
        },
        { t: "h", texte: "Le plan de trading, écrit avant" },
        { t: "p", html: "Contre toutes ces émotions, le premier outil est le <span class=\"mot\">plan de trading</span> (<em>trading plan</em>, leçon 24). Il s'écrit <b>avant d'ouvrir le graphique</b>, à froid, quand rien ne vous presse. Il répond à trois questions :" },
        {
          t: "tableau",
          entetes: ["La question", "Un exemple de réponse"],
          lignes: [
            ["<b>Quand entrer ?</b>", "Sur l'euro-dollar, quand le prix revient sur un support tracé en 4 heures et qu'une bougie le rejette."],
            ["<b>Où sortir ?</b>", "Stop 20 pips sous l'entrée ; objectif 40 pips au-dessus. Je ne déplace jamais le stop pour perdre plus."],
            ["<b>Combien risquer ?</b>", "1 % du compte par trade, soit 20 $ sur 2 000 $. Deux pertes dans la journée : j'arrête."],
          ],
          legende: "Pendant la séance, vous n'avez plus de décision à prendre : seulement à vérifier que le plan est respecté.",
        },
        {
          t: "outil",
          titre: "Une séance, quatre tentations",
          consigne: "Votre plan est écrit : setup sur support, stop de 20 pips, 1 % de risque. Décidez à chaque moment de la séance. Le journal se remplit tout seul.",
          el: <SeanceTrader />,
        },
        { t: "h", texte: "Le journal, relu chaque semaine" },
        { t: "p", html: "Le second outil est le <span class=\"mot\">journal de trading</span> (<em>trading journal</em>) : après chaque trade, vous notez <b>ce que vous avez fait</b> (l'entrée, le stop, la sortie, le résultat) et <b>ce que vous avez ressenti</b> (calme, pressé, en colère, ennuyé). La deuxième colonne est la plus précieuse." },
        { t: "p", html: "Relisez-le <b>chaque semaine</b>. Vous verrez les mêmes erreurs revenir : les pertes du lundi matin, les trades pris après une perte, ceux pris « pour s'occuper ». Une erreur qu'on voit écrite dix fois finit par se corriger. Une erreur qu'on oublie se répète." },
        {
          t: "tableau",
          entetes: ["Jour", "Ce que j'ai fait", "Ce que j'ai ressenti", "Résultat", "Dans le plan ?"],
          lignes: [
            ["Lundi", "Achat sur support, stop 20 pips", "Calme", "+40 $", "Oui"],
            ["Lundi", "Achat juste après, 0,30 lot", "Euphorique, « je suis en forme »", "−60 $", "Non"],
            ["Mercredi", "Rien, pas de setup", "Ennui", "0 $", "Oui"],
            ["Jeudi", "Vente sur résistance, stop 20 pips", "Un peu tendu", "−20 $", "Oui"],
            ["Jeudi", "Achat après une envolée", "Peur de rater (FOMO)", "−25 $", "Non"],
          ],
          legende: "Relu le vendredi : sans les deux trades hors plan, la semaine finissait à +20 $ ; avec eux, à −65 $. L'euphorie après un gain, le FOMO après une perte.",
        },
        { t: "h", texte: "Avant d'ouvrir le graphique" },
        { t: "p", html: "Dernier réflexe : avant chaque séance, prenez trente secondes pour vous demander dans quel état vous êtes. Si vous êtes fatigué, en colère après une perte, ou simplement en train de vous ennuyer, la meilleure décision de la journée est souvent de ne pas trader." },
        {
          t: "outil",
          titre: "Le baromètre d'avant séance",
          consigne: "Répondez honnêtement. Le baromètre dit si c'est le bon moment pour trader.",
          el: <BarometreTrader />,
        },
        { t: "piege", html: "<b>Croire qu'on sera plus fort que ses émotions.</b> Tout le monde le croit, avant sa première vraie perte. On ne gagne pas contre ses émotions en serrant les dents pendant la séance ; on gagne en décidant avant (le plan) et en regardant après (le journal). Et le meilleur entraînement, c'est le compte démo (leçon 23), avec un journal aussi sérieux qu'en réel." },
        { t: "nimbo", texte: "Le Journal du site garde vos trades fictifs, avec une case pour ce que vous avez ressenti. Remplissez-la à chaque fois : c'est elle que vous relirez le vendredi.", humeur: "content" },
      ],
    },
  ],
  mots: [
    { terme: "Peur", en: "fear", def: "L'émotion qui fait vendre pour que ça s'arrête, souvent au plus bas." },
    { terme: "Avidité", en: "greed", def: "L'envie d'en avoir toujours plus, qui fait acheter quand tout monte, souvent au plus haut." },
    { terme: "Acheter haut, vendre bas", en: "buy high, sell low", def: "Le résultat des deux émotions : acheter cher, revendre moins cher." },
    { terme: "FOMO", en: "fear of missing out", def: "La peur de rater le train, qui fait entrer sans plan dans un mouvement déjà parti." },
    { terme: "Trading de revanche", en: "revenge trading", def: "Reprendre tout de suite un trade, souvent plus gros, pour se refaire après une perte." },
    { terme: "Surtrading", en: "overtrading", def: "Prendre trop de trades : chacun coûte le spread, et la fatigue multiplie les erreurs." },
    { terme: "Spread", en: "spread", def: "L'écart entre le prix d'achat et le prix de vente : le coût payé à chaque trade." },
    { terme: "Plan de trading", en: "trading plan", def: "Les règles écrites avant d'ouvrir le graphique : quand entrer, où sortir, combien risquer." },
    { terme: "Journal de trading", en: "trading journal", def: "Le carnet où l'on note chaque trade et ce qu'on a ressenti, relu chaque semaine." },
  ],
  retenir: [
    "Deux émotions décident à votre place si vous les laissez faire : <b>l'avidité</b> fait acheter trop haut, <b>la peur</b> fait vendre trop bas.",
    "Le <b>FOMO</b> fait sauter dans un train déjà parti, sans plan. <b>Un train parti, on le laisse partir</b> : il y en aura d'autres.",
    "Après une perte, <b>une pause, jamais un trade plus gros</b> : la revanche fait grandir la perte.",
    "<b>Peu de trades, mais bien choisis</b> : chacun coûte le spread, et la fatigue fait faire des erreurs.",
    "Un <b>plan écrit avant</b> d'ouvrir le graphique : quand entrer, où sortir, combien risquer.",
    "Un <b>journal après</b> chaque trade, ce que vous avez fait et ressenti, relu chaque semaine : les mêmes erreurs reviennent.",
  ],
  quiz: [
    { question: "Le prix monte depuis des jours et tout le monde en parle. Vous avez très envie d'acheter. Quelle émotion vous pousse ?", options: ["La peur", "L'avidité", "La prudence"], correct: 1, explanation: "Vouloir toujours plus quand ça monte, c'est l'avidité. Elle est souvent la plus forte au sommet, au pire moment pour acheter." },
    { question: "Qu'est-ce que le FOMO ?", options: ["Une stratégie qui suit la tendance", "La peur de rater le train, qui fait entrer sans plan", "Un indicateur de volatilité"], correct: 1, explanation: "Fear of missing out : la peur de passer à côté. On saute dans un mouvement déjà parti, sans stop ni objectif, souvent juste avant qu'il ne redescende." },
    { question: "Vous venez de perdre 20 $, la perte prévue par votre plan. Que faire ?", options: ["Reprendre tout de suite un trade trois fois plus gros pour se refaire", "Faire une pause, noter le trade dans le journal, et attendre le prochain setup", "Supprimer le stop au prochain trade"], correct: 1, explanation: "Une perte prévue fait partie du plan. Le trade plus gros pour se refaire, c'est le revenge trading : on suit sa colère, et la perte grandit." },
    { question: "Pourquoi l'overtrading coûte-t-il cher, même sans grosse perte ?", options: ["Chaque trade paie le spread, et la fatigue fait faire des erreurs", "Parce que le courtier interdit plus de dix trades", "Il ne coûte rien si les trades sont petits"], correct: 0, explanation: "Vingt trades à 1 $ de spread, c'est 20 $ par jour, 1 % d'un compte de 2 000 $, avant de savoir si les trades sont bons. Et la fatigue multiplie les erreurs." },
    { question: "Dans un journal de trading, quelle colonne aide le plus à corriger ses erreurs ?", options: ["Le nom de l'actif", "Ce que j'ai ressenti au moment du trade", "L'heure exacte à la seconde près"], correct: 1, explanation: "Les erreurs viennent surtout des émotions. En les notant et en relisant chaque semaine, vous voyez les mêmes revenir : après une perte, par ennui, par FOMO." },
  ],
  pratique: [
    { texte: "Tenez votre journal : après chaque trade fictif, notez ce que vous avez fait et ce que vous avez ressenti.", href: "/journal", bouton: "Ouvrir le journal" },
    { texte: "Écrivez votre plan avant la prochaine séance : quand entrer, où sortir, combien risquer.", href: "/strategie", bouton: "Écrire ma stratégie" },
  ],
};

export default lecon;
