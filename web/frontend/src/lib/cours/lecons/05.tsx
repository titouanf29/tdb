import { serie, type Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { DeuxSensOr } from "@/components/cours/outils/DeuxSensOr";
import { BalanceOr } from "@/components/cours/outils/BalanceOr";
import { ConvertisseurOr } from "@/components/cours/outils/ConvertisseurOr";
import { TailleOr } from "@/components/cours/outils/TailleOr";

function recoller(a: Bougie[], b: Bougie[]): Bougie[] {
  const c = b.map((x) => ({ ...x }));
  c[0].o = a[a.length - 1].c;
  c[0].h = Math.max(c[0].h, c[0].o);
  c[0].l = Math.min(c[0].l, c[0].o);
  return [...a, ...c];
}

// Partie 1 : calme pendant des heures, puis brutal (bougies de 5 minutes).
const calmeBrutal = serie([[0, 4001], [10, 3998], [18, 4002], [26, 3999], [27, 3990], [29, 3966, "bas"], [33, 3978], [38, 3972]], { graine: 51, bruit: 0.00035, meche: 0.8 });
// Partie 1 : le week-end, puis la réouverture du lundi plus haut (bougies d'une heure).
const lundi = [
  ...serie([[0, 3984], [8, 3992], [14, 3988], [19, 3995]], { graine: 52, bruit: 0.0007 }),
  ...serie([[0, 4021], [5, 4016], [12, 4026]], { graine: 53, bruit: 0.0008 }),
];
// Partie 2 : la bougie de 14 h 30, +28 $ en cinq minutes.
const avant1430 = serie([[0, 3996], [8, 4002], [14, 3998], [20, 4001]], { graine: 54, bruit: 0.0003, meche: 0.8 });
const bougie1430: Bougie[] = [{ o: 4001, h: 4031, l: 3998, c: 4029, v: 3000 }];
const apres1430 = serie([[0, 4029], [4, 4024], [9, 4033], [13, 4030]], { graine: 55, bruit: 0.0006 });
const quatorzeTrente = recoller([...avant1430, ...bougie1430], apres1430);
// Partie 3 : des bougies journalières, souvent plus de 1 % (40 $) entre le haut et le bas.
const journalier = serie([[0, 3900], [6, 3960], [10, 3930], [16, 4040], [19, 4000], [20, 3958], [26, 4010], [32, 3985]], { graine: 56, bruit: 0.0075, meche: 0.9 });
// Partie 4 : un trade d'école, achat à 4 000 $ au-dessus d'un creux à 3 991 $.
const trade = serie([[0, 3982], [6, 3996], [11, 3991, "bas"], [16, 4000], [22, 4009], [27, 4004], [33, 4016]], { graine: 57, bruit: 0.0005, meche: 0.8 });

const lecon: LeconSerie = {
  numero: 5,
  accroche: "Quand vous tradez le gold, qu'est-ce que vous achetez vraiment ? Un lingot ? Pas du tout.",
  promesse: "En quatre parties, vous allez comprendre ce qu'est l'or en trading, pourquoi et quand il bouge, quels risques il porte, et une méthode prudente pour l'apprendre sans vous brûler.",
  parties: [
    {
      titre: "Le gold, c'est quoi ?",
      blocs: [
        { t: "h", texte: "Les noms : gold, XAUUSD" },
        { t: "p", html: "En anglais, l'or se dit <span class=\"mot\">gold</span>. Sur une plateforme de trading, il s'écrit <span class=\"mot\">XAUUSD</span> (ou XAU/USD). Les trois premières lettres, <b>XAU</b>, désignent l'or : c'est son code international, tiré de son nom latin, <em>aurum</em>. Les trois dernières, <b>USD</b>, le dollar américain. XAUUSD se lit donc « l'or en dollars »." },
        { t: "h", texte: "Le prix d'une once" },
        { t: "p", html: "Le prix affiché est celui d'<b>une once d'or</b>, l'unité des métaux précieux : environ <b>31 grammes</b> (31,1 g exactement). Dans nos exemples, l'once vaut <b>4 000 $</b>. Quand le prix passe de 4 000 $ à 4 020 $, on dit que l'or a pris 20 dollars." },
        { t: "h", texte: "Un contrat sur son prix, pas un lingot" },
        { t: "p", html: "Chez un courtier en ligne, vous n'achetez <b>pas de vrai lingot</b>. Vous tradez un contrat sur son prix, le plus souvent un <span class=\"mot\">CFD</span> (<em>Contract For Difference</em>, un contrat sur la différence) : vous gagnez ou perdez <b>la différence entre le prix d'ouverture et le prix de fermeture</b>, sans jamais toucher le métal. Personne ne stocke d'or pour vous, et vous ne pourrez jamais le récupérer." },
        { t: "p", html: "Et ce contrat marche <b>dans les deux sens</b> : vous pouvez <b>acheter</b> si vous pensez que le prix va monter, ou <b>vendre</b> si vous pensez qu'il va baisser (sans rien posséder au départ : c'est la vente à découvert, leçon 15)." },
        {
          t: "outil",
          titre: "Acheter ou vendre",
          consigne: "Deux traders ouvrent au même prix, l'un à l'achat, l'autre à la vente. Faites bouger le prix et regardez ce que chacun gagne ou perd.",
          el: <DeuxSensOr />,
        },
        { t: "h", texte: "Qui fait bouger ce marché ?" },
        {
          t: "liste",
          items: [
            "<b>Les banques centrales</b>, qui gardent de l'or dans leurs réserves. Elles en achètent beaucoup depuis quelques années.",
            "<b>Les grands fonds</b> d'investissement, qui en achètent ou en vendent par tonnes.",
            "<b>La bijouterie</b>, surtout en Inde et en Chine, une grosse part de la demande d'or physique.",
            "<b>Les particuliers</b>, nombreux, qui tradent son prix à travers les courtiers.",
          ],
        },
        { t: "h", texte: "Presque 24 h sur 24, en semaine" },
        { t: "p", html: "L'or s'échange <b>presque jour et nuit, du dimanche soir au vendredi soir</b>, avec une courte pause chaque soir vers 23 h (heure de Paris, selon le courtier). Le week-end, tout est fermé. Et le lundi, le prix peut <b>repartir d'un autre niveau</b> que celui du vendredi, si une nouvelle est tombée entre-temps." },
        {
          t: "graphique",
          cfg: { bougies: lundi, unite: "heure", niveaux: [{ prix: 3995, label: "Vendredi soir", couleur: "var(--cap-ink-3)" }], notes: [{ i: 20, prix: 4021, texte: "Lundi", dessous: true }] },
          legende: "Vendredi soir, l'once ferme vers 3 995 $. Lundi, elle rouvre vers 4 021 $ : 26 $ plus haut, sans avoir coté entre les deux. Cours d'exemple.",
        },
        { t: "h", texte: "Calme… puis brutal" },
        { t: "p", html: "Ce qui rend l'or particulier : il peut rester calme pendant des heures, dans un couloir de quelques dollars, <b>puis bouger de plusieurs dizaines de dollars en quelques minutes</b>. C'est pour ça qu'il attire, et c'est pour ça qu'il est dangereux." },
        {
          t: "scenes",
          titre: "L'or en bougies de 5 minutes",
          scenes: [
            { legende: "Plus de deux heures dans un couloir de quelques dollars, autour de 4 000 $.", cfg: { bougies: calmeBrutal, jusqua: 26, unite: "5 minutes", zones: [{ i0: 0, i1: 26, p0: 3996, p1: 4005, couleur: "var(--cap-ink-3)", label: "Le calme" }] } },
            { legende: "Puis, en un quart d'heure, l'once perd <b>35 $</b>. Avec un lot, ce serait 3 500 $ (partie 3).", cfg: { bougies: calmeBrutal, jusqua: 29, unite: "5 minutes", zones: [{ i0: 0, i1: 26, p0: 3996, p1: 4005, couleur: "var(--cap-ink-3)", label: "Le calme" }], surligne: [27, 28, 29] } },
            { legende: "Ensuite, le prix se stabilise plus bas. Celui qui était acheteur sans stop a vu son gain fondre en quelques minutes.", cfg: { bougies: calmeBrutal, unite: "5 minutes", zones: [{ i0: 0, i1: 26, p0: 3996, p1: 4005, couleur: "var(--cap-ink-3)", label: "Le calme" }] } },
          ],
        },
        { t: "p", html: "<b>En résumé</b> : le gold, c'est XAUUSD, le prix d'une once d'or en dollars. Vous tradez un contrat, dans les deux sens, presque jour et nuit en semaine. La partie suivante explique pourquoi il bouge, et à quelle heure." },
      ],
    },
    {
      titre: "Pourquoi et quand il bouge",
      blocs: [
        { t: "p", html: "Plus bas, vous verrez une bougie de cinq minutes où l'once prend <b>28 dollars</b> d'un coup. Pour comprendre pourquoi, il faut connaître les trois moteurs de l'or, et son heure préférée." },
        { t: "h", texte: "Premier moteur : le dollar" },
        { t: "p", html: "L'or se paie en dollars. Quand le dollar <b>baisse</b>, il en faut davantage pour acheter la même quantité d'or : le prix de l'once, en dollars, <b>monte</b>. Et pour qui paie en euros, l'or devient moins cher, donc plus demandé. À l'inverse, un dollar fort pèse souvent sur l'or." },
        { t: "h", texte: "Deuxième moteur : les taux d'intérêt" },
        { t: "p", html: "L'or <b>ne rapporte rien</b> : pas d'intérêt, pas de dividende. Quand les taux d'intérêt sont hauts, garder de l'or « coûte » ce qu'on aurait gagné en plaçant l'argent ailleurs. Quand les taux <b>baissent</b>, ce manque à gagner diminue : l'or attire plus d'acheteurs." },
        { t: "h", texte: "Troisième moteur : la peur" },
        { t: "p", html: "Quand une crise éclate (une guerre, une panique bancaire, une récession), beaucoup achètent de l'or pour protéger leur argent. On dit que c'est une <span class=\"mot\">valeur refuge</span> (<em>safe haven</em>) : on s'y abrite quand tout le reste fait peur." },
        {
          t: "outil",
          titre: "La balance des trois moteurs",
          consigne: "Réglez le dollar, les taux et la peur, et regardez vers où la balance penche. Essayez aussi les exemples sous la balance.",
          el: <BalanceOr />,
        },
        { t: "h", texte: "Quand bouge-t-il le plus ? L'après-midi" },
        { t: "p", html: "L'or bouge surtout <b>l'après-midi, heure de Paris</b>, quand <b>Londres et New York</b> sont ouverts en même temps (de 14 h à 18 h environ). Londres est la grande place du marché de l'or physique, New York celle des contrats à terme : quand les deux travaillent, il y a le plus de monde, et les plus grands mouvements. La nuit, avec l'Asie, il est souvent plus calme (leçon 12)." },
        { t: "h", texte: "Et surtout à 14 h 30" },
        { t: "p", html: "À <b>14 h 30</b>, heure de Paris, tombent les grands chiffres américains, comme l'emploi (le NFP) ou l'inflation (le CPI). Ils font bouger <b>les taux attendus, donc le dollar… donc l'or</b>. Les trois moteurs se mettent en route d'un coup (leçon 13)." },
        {
          t: "scenes",
          titre: "La bougie de 14 h 30",
          scenes: [
            { legende: "<b>14 h 25.</b> L'once tourne autour de 4 000 $. Tout le monde attend le chiffre de l'emploi américain.", cfg: { bougies: quatorzeTrente, jusqua: 20, unite: "5 minutes" } },
            { legende: "<b>14 h 30.</b> Le chiffre est bien plus faible que prévu : les taux attendus baissent, le dollar recule, et l'or bondit de <b>28 $</b> en cinq minutes. Voilà notre bougie.", cfg: { bougies: quatorzeTrente, jusqua: 21, unite: "5 minutes", surligne: [21] } },
            { legende: "Ensuite, le prix hésite, plus haut. Un chiffre dans l'autre sens aurait fait l'inverse : on ne devine pas le chiffre, on sait juste <b>à quelle heure</b> le danger arrive.", cfg: { bougies: quatorzeTrente, unite: "5 minutes", niveaux: [{ prix: 4001, label: "Avant 14 h 30", couleur: "var(--cap-ink-3)" }] } },
          ],
        },
        { t: "h", texte: "Le bon réflexe : le calendrier économique" },
        { t: "p", html: "Chaque matin, regardez le <span class=\"mot\">calendrier économique</span> (<em>economic calendar</em>) : la liste des chiffres du jour, avec leur heure et leur importance. Vous saurez si 14 h 30 sera calme ou agité, et si une décision de taux tombe le soir." },
        { t: "nimbo", texte: "L'Agenda macro du site affiche les annonces de la semaine à l'heure de Paris. Un coup d'œil le matin, avant de regarder l'or, vous évite d'être surpris à 14 h 30.", humeur: "pointe" },
        { t: "p", html: "<b>En résumé</b> : le dollar, les taux, la peur… et 14 h 30. La partie suivante parle des risques." },
      ],
    },
    {
      titre: "Les risques",
      blocs: [
        { t: "p", html: "Un petit mouvement sur l'or peut coûter très cher. Voici les risques, un par un, et à la fin, une réponse honnête : est-ce fait pour un débutant ?" },
        { t: "h", texte: "Premier risque : il bouge fort" },
        { t: "p", html: "L'or bouge souvent de <b>plus de 1 % par jour</b> entre son plus haut et son plus bas. À 4 000 $ l'once, 1 %, c'est <b>40 dollars</b>. Bien plus que l'euro-dollar, qui fait souvent moins de 1 % dans sa journée." },
        {
          t: "graphique",
          cfg: { bougies: journalier, unite: "jour", surligne: [20] },
          legende: "Des bougies d'un jour (cours d'exemple). La bougie encadrée perd plus de 40 $ dans la journée : c'est fréquent sur l'or.",
        },
        { t: "h", texte: "Deuxième risque : la taille du lot" },
        { t: "p", html: "Sur l'or, un <span class=\"mot\">lot</span> vaut, chez la plupart des courtiers, <b>100 onces</b>. Chaque dollar de mouvement de l'once vaut donc <b>100 $</b> pour un lot, 10 $ pour 0,10 lot, et 1 $ pour 0,01 lot (une once)." },
        {
          t: "exemple",
          html: "Vous avez acheté <b>1 lot</b> d'or à 4 000 $. Dans la journée, l'once baisse de <b>40 $</b>. Votre perte : 40 × 100 = <b>4 000 $</b>. En une journée, deux fois un compte de 2 000 $.",
        },
        {
          t: "outil",
          titre: "Combien vaut un mouvement ?",
          consigne: "Choisissez le mouvement de l'once et la taille : regardez ce qu'il vaut, et ce qu'il pèse sur un compte de 2 000 $.",
          el: <ConvertisseurOr />,
        },
        { t: "h", texte: "Troisième risque : l'effet de levier" },
        { t: "p", html: "Avec l'<span class=\"mot\">effet de levier</span> (<em>leverage</em>), vous ne déposez qu'une petite partie de la valeur de la position, la marge, mais vous gagnez ou perdez <b>sur la valeur entière</b>. En Europe, pour un particulier, le levier sur l'or est <b>de 20 au maximum</b> : une marge de 5 %." },
        {
          t: "exemple",
          html: "1 lot d'or à 4 000 $, c'est 100 onces : <b>400 000 $</b> de valeur. Au levier 20, la marge demandée est de 400 000 / 20 = <b>20 000 $</b>. Avec 0,10 lot, la marge est de 2 000 $ : tout un compte de 2 000 $ bloqué pour une seule position, et 40 $ de baisse coûteraient 400 $, soit 20 % du compte. Le levier ne crée pas le risque, il permet d'ouvrir des positions bien trop grandes pour votre compte.",
        },
        { t: "h", texte: "Quatrième risque : les annonces" },
        { t: "p", html: "À 14 h 30, le prix peut sauter, le <span class=\"mot\">spread</span> (l'écart entre le prix d'achat et le prix de vente) s'élargit pendant quelques secondes, et un ordre peut passer plus loin que prévu : c'est le slippage. Un stop placé à 10 $ de l'entrée peut être exécuté à 15 $ ou plus (leçon 13)." },
        { t: "h", texte: "La plupart des particuliers perdent" },
        { t: "p", html: "La <b>plupart des particuliers perdent de l'argent sur les CFD</b>. En Europe, c'est même une obligation : chaque courtier doit afficher, sur son site, la part de ses clients particuliers qui perdent de l'argent, et elle est le plus souvent très largement majoritaire. Ce n'est pas une phrase de prudence pour la forme : c'est le résultat réel, mesuré." },
        {
          t: "qr", items: [
            { q: "Alors, l'or, fait pour un débutant ?", r: "Pas le plus simple. Il bouge fort, un lot pèse lourd, et les annonces le secouent. Mais c'est possible <b>si vous pensez au risque avant les gains</b> : en démo d'abord, avec la plus petite taille, et une méthode (la partie suivante)." },
            { q: "Un stop protège-t-il de tout ?", r: "Il limite la perte dans la plupart des cas, mais pas au dollar près : à l'annonce ou à la réouverture du lundi, le prix peut sauter par-dessus. C'est pour ça qu'on garde une petite taille." },
            { q: "Le levier, c'est forcément mauvais ?", r: "Non, c'est un outil. Ce qui compte, c'est la taille de la position par rapport au compte. Avec 0,01 lot, le levier ne change presque rien à votre risque ; avec un lot, il vous laisse perdre bien plus que votre compte en une journée." },
          ],
        },
        { t: "p", html: "<b>En résumé</b> : il bouge fort, un lot pèse lourd, le levier grossit tout, et les annonces surprennent. La dernière partie propose une méthode pour apprendre sans vous brûler." },
      ],
    },
    {
      titre: "La méthode pour apprendre",
      blocs: [
        { t: "p", html: "Voici une méthode prudente, en six étapes. Ce n'est <b>pas un conseil personnalisé</b>, ni une façon de gagner : c'est une façon d'<b>apprendre</b> en limitant la casse." },
        { t: "h", texte: "Étape 1 : le compte démo" },
        { t: "p", html: "Commencez en <b>démo</b> : de l'argent fictif, mais de vrais prix. Vos erreurs sont gratuites, et vous découvrez comment l'or bouge à 14 h 30, le lundi matin, la nuit. C'est exactement ce que propose ce site." },
        { t: "h", texte: "Étape 2 : la plus petite taille" },
        { t: "p", html: "Même en démo, prenez l'habitude de la <b>plus petite taille : 0,01 lot</b>. Un dollar de mouvement ne vaut plus qu'un dollar. 40 $ de baisse dans la journée, c'est 40 $, pas 4 000 $." },
        { t: "h", texte: "Étape 3 : un stop loss à chaque trade" },
        { t: "p", html: "Un <span class=\"mot\">stop loss</span> à chaque trade, placé à un endroit logique : <b>sous un niveau clair</b>, comme le dernier creux (le point le plus bas avant la remontée). Et une fois posé, <b>jamais retiré</b>, ni éloigné quand le prix s'en approche." },
        { t: "h", texte: "Étape 4 : 1 % et le calcul de la taille" },
        { t: "p", html: "Décidez <b>à l'avance</b> votre perte maximale par trade. Beaucoup s'arrêtent à <b>1 % du compte</b>. Ensuite, la <span class=\"mot\">taille de position</span> (<em>position size</em>) se calcule : elle découle de cette perte et de la distance du stop, jamais de l'envie." },
        {
          t: "scenes",
          titre: "Un trade d'école, étape par étape",
          scenes: [
            { legende: "L'or remonte après un creux, à <b>3 991 $</b> : le dernier point bas.", cfg: { bougies: trade, jusqua: 16, unite: "5 minutes", marques: [{ i: 11, type: "point" }] } },
            { legende: "Vous achetez à <b>4 000 $</b>.", cfg: { bougies: trade, jusqua: 16, unite: "5 minutes", marques: [{ i: 11, type: "point" }, { i: 16, type: "achat", label: "Achat 4 000 $" }] } },
            { legende: "Le stop se place juste sous le creux, à <b>3 990 $</b> : 10 $ sous l'entrée. Si le prix y descend, l'idée était fausse.", cfg: { bougies: trade, jusqua: 16, unite: "5 minutes", marques: [{ i: 11, type: "point" }, { i: 16, type: "achat", label: "Achat 4 000 $" }], niveaux: [{ prix: 3990, label: "Stop 3 990 $", couleur: "var(--cap-down)" }] } },
            { legende: "Sur un compte de 2 000 $, 1 %, c'est <b>20 $</b>. Un lot perdrait 10 × 100 = 1 000 $ au stop. Taille : 20 ÷ 1 000 = <b>0,02 lot</b>. Ensuite, le temps fait son œuvre : ici, le prix monte, mais il aurait pu toucher le stop.", cfg: { bougies: trade, unite: "5 minutes", marques: [{ i: 11, type: "point" }, { i: 16, type: "achat", label: "0,02 lot" }], niveaux: [{ prix: 3990, label: "Stop 3 990 $ : −20 $", couleur: "var(--cap-down)" }] } },
          ],
        },
        {
          t: "exemple",
          html: "Compte de <b>2 000 $</b>, 1 % : vous acceptez de perdre <b>20 $</b>. Stop <b>10 $</b> sous l'entrée : un lot entier perdrait 10 × 100 = <b>1 000 $</b>. Taille : 20 ÷ 1 000 = <b>0,02 lot</b>. Vérification : 0,02 lot, c'est 2 onces ; 10 $ × 2 = 20 $. Le compte tombe à 1 980 $ si le stop est touché, pas plus (hors spread et slippage).",
        },
        {
          t: "outil",
          titre: "Calculez votre taille sur l'or",
          consigne: "Réglez le compte, la perte acceptée et la distance du stop : la taille se calcule en trois lignes. Essayez un stop de 30 $ sur 2 000 $.",
          el: <TailleOr />,
        },
        { t: "h", texte: "Étape 5 : le calendrier" },
        { t: "p", html: "Chaque matin, le calendrier économique. Et une règle simple : <b>pas de nouvelle position juste avant 14 h 30</b> quand un chiffre fort est prévu. Si vous êtes déjà en position, décidez avant : garder en acceptant que le stop glisse, réduire, ou fermer." },
        { t: "h", texte: "Étape 6 : un journal" },
        { t: "p", html: "Pour chaque trade, notez <b>pourquoi vous entrez</b>, <b>où est votre stop</b> et pourquoi là, et <b>ce qui s'est passé</b>. Au bout de vingt trades, relisez : vous verrez vos erreurs qui reviennent. C'est le moyen le plus sûr de progresser." },
        { t: "h", texte: "La règle d'or : jamais de revanche" },
        { t: "p", html: "Après une perte, l'envie de « se refaire » est forte : on double la mise pour récupérer d'un coup. <b>Ne le faites jamais.</b> C'est le <em>revenge trading</em>, et c'est comme ça que les comptes explosent : la perte suivante, deux fois plus grosse, arrive aussi souvent que la précédente." },
        { t: "piege", html: "<b>Doubler la mise après une perte.</b> Vous perdez 20 $, vous repartez avec 0,04 lot au lieu de 0,02 pour « récupérer ». Si le stop est touché, vous perdez 40 $ : 60 $ en deux trades, 3 % du compte. Puis 0,08 lot… Quatre pertes de suite, ce qui arrive à tout le monde, et vous avez perdu 20 + 40 + 80 + 160 = <b>300 $</b>, 15 % du compte, au lieu de 80 $. La taille ne change pas après une perte : elle se recalcule à 1 %." },
        { t: "nimbo", texte: "Le journal du site garde la trace de vos trades fictifs : la raison, le stop, le résultat. Relisez-le chaque semaine, c'est là que se cachent vos progrès.", humeur: "pointe" },
        { t: "p", html: "<b>En résumé</b> : démo, plus petite taille, stop à chaque trade, 1 % et le calcul de la taille, calendrier, journal… et jamais de revanche. La leçon suivante, la 6, présente les moyennes mobiles." },
      ],
    },
  ],
  mots: [
    { terme: "Or", en: "gold, XAUUSD", def: "Le prix d'une once d'or (31,1 grammes) en dollars ; XAU pour l'or, USD pour le dollar." },
    { terme: "CFD", en: "Contract For Difference", def: "Un contrat sur la différence de prix : on gagne ou perd sur le mouvement, sans posséder le métal." },
    { terme: "Valeur refuge", en: "safe haven", def: "Un placement qu'on achète quand on a peur ; l'or en est le plus connu." },
    { terme: "Calendrier économique", en: "economic calendar", def: "La liste des annonces du jour et de la semaine, avec leur heure et leur importance." },
    { terme: "Lot", en: "lot", def: "L'unité de taille d'une position ; sur l'or, 1 lot vaut le plus souvent 100 onces." },
    { terme: "Effet de levier", en: "leverage", def: "Trader une position plus grande que l'argent déposé ; 20 au maximum sur l'or pour un particulier en Europe." },
    { terme: "Spread", en: "spread", def: "L'écart entre le prix d'achat et le prix de vente ; il s'élargit aux annonces." },
    { terme: "Stop loss", en: "stop loss", def: "L'ordre qui ferme la position automatiquement si le prix atteint la perte que vous avez fixée." },
    { terme: "Taille de position", en: "position size", def: "Le nombre de lots, calculé à partir de la perte acceptée et de la distance du stop." },
  ],
  retenir: [
    "Le gold, c'est <b>XAUUSD</b> : le prix d'une once d'or en dollars. Chez un courtier, vous tradez un <b>contrat (souvent un CFD)</b>, dans les deux sens, presque jour et nuit en semaine.",
    "Trois moteurs : <b>le dollar, les taux, la peur</b>. Mais rien n'est mécanique.",
    "Il bouge surtout <b>l'après-midi</b>, quand Londres et New York sont ouverts, et à <b>14 h 30</b> : regardez le calendrier chaque matin.",
    "<b>1 lot = 100 onces</b> : 1 $ de mouvement vaut 100 $. Le levier (20 au maximum en Europe) permet des positions bien trop grandes.",
    "La plupart des particuliers <b>perdent de l'argent sur les CFD</b> : pensez au risque avant les gains.",
    "La méthode : <b>démo, 0,01 lot, stop, 1 % et le calcul de la taille, calendrier, journal, jamais de revanche</b>.",
  ],
  quiz: [
    { question: "Que désigne XAUUSD ?", options: ["Le prix d'un lingot d'un kilo en euros", "Le prix d'une once d'or en dollars", "Une crypto adossée à l'or"], correct: 1, explanation: "XAU est le code de l'or, USD celui du dollar : XAUUSD donne le prix d'une once (31,1 g) en dollars." },
    { question: "Le dollar baisse nettement. Vers où cela pousse-t-il l'or, toutes choses égales par ailleurs ?", options: ["Vers la hausse", "Vers la baisse", "Aucun effet"], correct: 0, explanation: "L'or se paie en dollars : quand le dollar baisse, il en faut davantage pour la même quantité d'or. C'est une poussée, pas une certitude." },
    { question: "Vous avez 1 lot d'or. L'once baisse de 40 $. Combien perdez-vous ?", options: ["40 $", "400 $", "4 000 $"], correct: 2, explanation: "1 lot = 100 onces : chaque dollar vaut 100 $. 40 × 100 = 4 000 $." },
    { question: "Compte de 2 000 $, 1 % de risque, stop à 10 $ de l'entrée. Quelle taille ?", options: ["0,02 lot", "0,20 lot", "1 lot"], correct: 0, explanation: "1 % = 20 $. Un lot perdrait 10 × 100 = 1 000 $. 20 ÷ 1 000 = 0,02 lot." },
    { question: "Vous venez de perdre 20 $. Que dit la méthode ?", options: ["Doubler la taille pour vous refaire", "Garder la taille calculée à 1 %, et noter le trade dans le journal", "Retirer le stop au prochain trade"], correct: 1, explanation: "Jamais de revanche : la taille se recalcule à 1 %, et le journal sert à comprendre la perte, pas à la rattraper." },
  ],
  pratique: [
    { texte: "Ouvrez un trade fictif sur l'or avec 0,01 lot et un stop sous le dernier creux.", href: "/trading", bouton: "Ouvrir le trading" },
    { texte: "Notez la raison, le stop et le résultat de ce trade dans votre journal.", href: "/journal", bouton: "Ouvrir le journal" },
  ],
};

export default lecon;
