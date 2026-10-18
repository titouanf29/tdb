import { serie, type Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { TraceNiveau } from "@/components/cours/outils/TraceNiveau";
import { CarteFigure } from "@/components/cours/outils/CarteFigure";
import { QuelleFigure } from "@/components/cours/outils/QuelleFigure";

/** La même figure, la tête en bas : chaque prix passe de l'autre côté de l'axe. */
function miroir(b: Bougie[], axe: number): Bougie[] {
  return b.map((k) => ({ o: 2 * axe - k.o, c: 2 * axe - k.c, h: 2 * axe - k.l, l: 2 * axe - k.h, v: k.v }));
}

const R = "var(--cap-down)", V = "var(--cap-up)", COU = "var(--cap-ambre)";
const opt = { bruit: 0.004, meche: 0.6 };

// Partie 1 : le double sommet, sur l'or vers 4 000 $.
const dsommet = serie([[0, 3880], [6, 3950], [12, 4040], [16, 4120, "haut"], [21, 4050], [24, 4030, "bas"], [28, 4080], [32, 4118, "haut"], [36, 4070], [39, 4045], [42, 4005], [45, 3985], [50, 3930], [56, 3880]], { graine: 101, ...opt });
const sansCassure = serie([[0, 3880], [8, 3990], [14, 4120, "haut"], [20, 4035, "bas"], [27, 4118, "haut"], [32, 4055], [35, 4045, "bas"], [40, 4100], [44, 4135], [48, 4180], [54, 4230]], { graine: 102, ...opt });
const dcreux = miroir(dsommet, 4000);
const exoCou = serie([[0, 3900], [7, 4000], [13, 4090, "haut"], [19, 4010, "bas"], [25, 4088, "haut"], [31, 4035], [34, 4015], [38, 3960], [44, 3920]], { graine: 103, ...opt });

// Partie 2 : la tête et les épaules, le triangle, la fausse cassure.
const tete = serie([[0, 3880], [6, 3980], [11, 4060, "haut"], [16, 4000, "bas"], [22, 4150, "haut"], [27, 4005, "bas"], [32, 4062, "haut"], [36, 4025], [39, 3985], [44, 3940], [50, 3890]], { graine: 104, ...opt });
const teteInv = miroir(tete, 4000);
const triangle = serie([[0, 3990], [6, 4100, "haut"], [11, 3940, "bas"], [16, 4080, "haut"], [21, 3970, "bas"], [26, 4060, "haut"], [30, 3998, "bas"], [32, 4030], [34, 4065], [37, 4100], [41, 4135]], { graine: 105, bruit: 0.003, meche: 0.6 });
const triangleBas = miroir(triangle, 4020);
const fausse = serie([[0, 3980], [6, 4060], [10, 4100, "haut"], [15, 4040], [20, 4098, "haut"], [25, 4050], [29, 4085], [31, 4132], [32, 4085], [35, 4040], [39, 3990], [44, 3950]], { graine: 106, ...opt });

// « Quelle figure ? »
const q1 = serie([[0, 3920], [7, 4010], [12, 4095, "haut"], [17, 4030, "bas"], [23, 4093, "haut"], [28, 4045], [31, 4028], [35, 3980], [40, 3950]], { graine: 111, ...opt });
const q2 = serie([[0, 3900], [5, 3990], [10, 4050, "haut"], [15, 3995, "bas"], [21, 4130, "haut"], [26, 3998, "bas"], [31, 4048, "haut"], [35, 4010], [38, 3975], [43, 3930]], { graine: 112, ...opt });
const q3 = miroir(serie([[0, 3910], [7, 4005], [12, 4090, "haut"], [17, 4020, "bas"], [23, 4092, "haut"], [28, 4040], [31, 4018], [35, 3970], [40, 3935]], { graine: 113, ...opt }), 4000);
const q4 = serie([[0, 4000], [5, 4090, "haut"], [10, 3950, "bas"], [15, 4072, "haut"], [20, 3975, "bas"], [25, 4055, "haut"], [29, 3998, "bas"], [31, 4020], [33, 3985], [36, 3945], [40, 3910]], { graine: 114, bruit: 0.003, meche: 0.6 });
const q5 = miroir(serie([[0, 3890], [5, 3985], [10, 4055, "haut"], [15, 4000, "bas"], [21, 4140, "haut"], [26, 4003, "bas"], [31, 4058, "haut"], [35, 4015], [38, 3980], [43, 3935]], { graine: 115, ...opt }), 4000);

const lecon: LeconSerie = {
  numero: 10,
  accroche: "Vous voyez ces deux sommets ? C'est une figure chartiste. À la fin de cette leçon, vous saurez la lire.",
  promesse: "À la fin de cette leçon, vous saurez reconnaître le double sommet, le double creux, la tête et les épaules et le triangle, tracer leur ligne de cou, et savoir quand une figure est confirmée, ou non.",
  parties: [
    {
      titre: "Le double sommet et le double creux",
      blocs: [
        { t: "h", texte: "Une figure chartiste, c'est quoi ?" },
        { t: "p", html: "Une <span class=\"mot\">figure chartiste</span> (en anglais <em>chart pattern</em>), c'est <b>un dessin que le prix fait souvent</b> sur un graphique. Les traders les ont repérées depuis plus d'un siècle, en regardant des milliers de graphiques : certains dessins reviennent, et ils sont parfois suivis du même mouvement." },
        { t: "p", html: "Le mot important est <b>parfois</b>. Une figure n'est pas une prédiction. Elle dit : « dans cette situation, voilà ce qui arrive assez souvent, et voilà le prix qui me dira si je me suis trompé ». C'est déjà beaucoup, parce qu'elle vous donne un endroit précis pour entrer et un endroit précis pour sortir." },
        { t: "p", html: "Pour la lire, vous avez besoin de deux notions vues dans la leçon 33 : la <span class=\"mot\">résistance</span> (<em>resistance</em>), un plafond où le prix a arrêté de monter, et le <span class=\"mot\">support</span> (<em>support</em>), un plancher où il a arrêté de baisser. Sur les graphiques de cette leçon, la résistance est en rouge, le support en vert, et la ligne de cou en ambre." },
        { t: "h", texte: "Le double sommet, en quatre temps" },
        { t: "p", html: "Le <span class=\"mot\">double sommet</span> (<em>double top</em>), c'est <b>deux sommets au même niveau</b>, après une hausse. Le prix monte, bute sur un plafond, redescend, remonte… et bute au même endroit. Deux fois, les acheteurs ont essayé de passer, deux fois les vendeurs les ont arrêtés. Suivez-le étape par étape." },
        {
          t: "scenes",
          titre: "Le double sommet se forme",
          scenes: [
            { legende: "Le prix monte, puis <b>bute vers 4 120 $</b> et redescend. Pour l'instant, ce n'est qu'un sommet comme un autre.", cfg: { bougies: dsommet, jusqua: 17, unite: "jour", marques: [{ i: 16, type: "point", prix: 4120 }] } },
            { legende: "Il remonte, et <b>bute au même endroit</b>. Les acheteurs n'arrivent pas à passer : 4 120 $ devient une résistance.", cfg: { bougies: dsommet, jusqua: 33, unite: "jour", niveaux: [{ prix: 4120, label: "Résistance", couleur: R }], marques: [{ i: 16, type: "point", prix: 4120 }, { i: 32, type: "point", prix: 4118 }] } },
            { legende: "Entre les deux sommets, il y a un creux, à 4 030 $. La ligne horizontale qui passe par ce creux s'appelle la <b>ligne de cou</b>. Tant que le prix reste au-dessus, <b>rien n'est sûr</b>.", cfg: { bougies: dsommet, jusqua: 39, unite: "jour", niveaux: [{ prix: 4120, label: "Résistance", couleur: R }, { prix: 4030, label: "Ligne de cou", couleur: COU }], marques: [{ i: 24, type: "point", prix: 4030 }] } },
            { legende: "Une bougie <b>clôture sous la ligne de cou</b> : la figure est confirmée. Les acheteurs qui comptaient sur ce plancher abandonnent.", cfg: { bougies: dsommet, jusqua: 42, unite: "jour", niveaux: [{ prix: 4120, label: "Résistance", couleur: R }, { prix: 4030, label: "Ligne de cou cassée", couleur: COU }], surligne: [42] } },
            { legende: "La baisse peut commencer. Ici, elle va loin. Elle aurait aussi pu s'arrêter vite : la figure annonçait une possibilité, pas une certitude.", cfg: { bougies: dsommet, unite: "jour", niveaux: [{ prix: 4120, label: "Résistance", couleur: R }, { prix: 4030, label: "Ligne de cou", couleur: COU }] } },
          ],
        },
        { t: "h", texte: "La ligne de cou décide de tout" },
        { t: "p", html: "La <span class=\"mot\">ligne de cou</span> (<em>neckline</em>) passe par <b>le creux entre les deux sommets</b>. C'est le dernier plancher des acheteurs. Tant qu'il tient, vous avez seulement deux sommets côte à côte, et le prix peut très bien repartir vers le haut." },
        { t: "p", html: "Quand une bougie <b>clôture</b> sous cette ligne (le prix de fin de la bougie, pas seulement une mèche), on parle de <span class=\"mot\">cassure</span> (<em>breakout</em>, leçon 30). C'est elle, et elle seule, qui confirme le double sommet. Sans cassure, pas de figure." },
        {
          t: "graphique",
          cfg: { bougies: sansCassure, unite: "jour", niveaux: [{ prix: 4120, label: "Résistance", couleur: R }, { prix: 4035, label: "Ligne de cou", couleur: COU }], marques: [{ i: 14, type: "point", prix: 4120 }, { i: 27, type: "point", prix: 4118 }] },
          legende: "Deux sommets au même niveau, et pourtant : le prix ne casse pas la ligne de cou. Il repart, et passe même la résistance. Celui qui avait vendu dès le deuxième sommet s'est trompé trop tôt.",
        },
        {
          t: "outil",
          titre: "Tracez la ligne de cou",
          consigne: "Ce graphique fait un double sommet. Cliquez à la hauteur de sa ligne de cou, puis comparez avec la correction.",
          el: <TraceNiveau bougies={exoCou} max={1} solutions={[{ prix: 4010, tolerance: 14, label: "La ligne de cou" }]}
            expliquer="Elle passe par le creux entre les deux sommets, vers 4 010 $. C'est sous ce prix, en clôture, que la figure serait confirmée." />,
        },
        { t: "h", texte: "À l'envers : le double creux" },
        { t: "p", html: "Retournez le graphique, et vous obtenez le <span class=\"mot\">double creux</span> (<em>double bottom</em>) : <b>deux creux au même niveau</b>, sur un support, après une baisse. Les vendeurs ont essayé deux fois de passer sous le plancher, deux fois les acheteurs les ont arrêtés. La ligne de cou passe cette fois par <b>le sommet entre les deux creux</b>, et la figure est confirmée quand le prix la casse <b>vers le haut</b>." },
        {
          t: "outil",
          titre: "Retournez la carte",
          consigne: "C'est le même dessin, la tête en bas. Retournez la carte pour passer de l'un à l'autre.",
          el: <CarteFigure
            face={{ titre: "Double sommet", texte: "Deux sommets à 4 120 $ sur une résistance, la ligne de cou par le creux du milieu, à 4 030 $. Cassée vers le bas : <b>la baisse peut commencer</b>.", cfg: { bougies: dsommet, niveaux: [{ prix: 4120, label: "Résistance", couleur: R }, { prix: 4030, label: "Ligne de cou", couleur: COU }] } }}
            dos={{ titre: "Double creux", texte: "Deux creux à 3 880 $ sur un support, la ligne de cou par le sommet du milieu, à 3 970 $. Cassée vers le haut : <b>la hausse peut commencer</b>.", cfg: { bougies: dcreux, niveaux: [{ prix: 3880, label: "Support", couleur: V }, { prix: 3970, label: "Ligne de cou", couleur: COU }] } }} />,
        },
        {
          t: "tableau",
          entetes: ["", "Double sommet", "Double creux"],
          lignes: [
            ["Où il apparaît", "Après une hausse", "Après une baisse"],
            ["Le dessin", "Deux sommets au même niveau", "Deux creux au même niveau"],
            ["Le niveau en jeu", "Une résistance", "Un support"],
            ["La ligne de cou passe par", "Le creux entre les sommets", "Le sommet entre les creux"],
            ["Confirmé quand", "Le prix clôture sous la ligne de cou", "Le prix clôture au-dessus de la ligne de cou"],
            ["Ce qu'il annonce, parfois", "Une baisse", "Une hausse"],
          ],
        },
        {
          t: "qr", items: [
            { q: "Les deux sommets doivent-ils être exactement au même prix ?", r: "Non. Comme pour un support ou une résistance, c'est une zone : quelques dollars d'écart sur l'or, ou une mèche qui dépasse un peu, ne changent rien. Si le deuxième sommet passe nettement au-dessus du premier, en revanche, ce n'est plus un double sommet : c'est une hausse qui continue." },
            { q: "Combien de temps entre les deux sommets ?", r: "Assez pour qu'on voie un vrai creux entre les deux : une dizaine de bougies au moins. Deux sommets collés l'un à l'autre ne disent pas grand-chose." },
            { q: "Ça marche sur toutes les unités de temps ?", r: "Le dessin existe partout, du graphique en 5 minutes au graphique hebdomadaire. Comme pour les niveaux, une figure sur une grande unité de temps (le jour, la semaine) est vue par plus de monde, et compte davantage." },
          ],
        },
        { t: "piege", html: "<b>Vendre au deuxième sommet, avant la cassure.</b> C'est tentant : vous « voyez » la figure et vous voulez entrer tôt, au meilleur prix. Mais tant que la ligne de cou n'est pas cassée, vous pariez sur un dessin qui n'existe pas encore. Attendez la clôture sous la ligne de cou : vous entrez un peu moins bien, mais sur une figure confirmée." },
      ],
    },
    {
      titre: "La tête et les épaules, le triangle",
      blocs: [
        { t: "h", texte: "La tête et les épaules" },
        { t: "p", html: "La <span class=\"mot\">tête et les épaules</span> (<em>head and shoulders</em>) est la figure la plus connue. Elle a <b>trois sommets</b> : celui du milieu, la tête, est <b>le plus haut</b> ; les deux autres, les épaules, sont plus bas et à peu près à la même hauteur. Elle apparaît après une hausse, et elle annonce un <b>retournement possible</b> : la hausse s'essouffle, et la tendance peut passer à la baisse." },
        { t: "p", html: "Pourquoi ? Parce que l'épaule droite est un aveu de faiblesse. Après la tête, les acheteurs n'arrivent même plus à remonter aussi haut : ils sont à bout de souffle." },
        {
          t: "scenes",
          titre: "Une tête et deux épaules",
          scenes: [
            { legende: "Le prix monte, fait un premier sommet vers 4 060 $, puis redescend : c'est <b>l'épaule gauche</b>.", cfg: { bougies: tete, jusqua: 13, unite: "jour", notes: [{ i: 11, prix: 4060, texte: "Épaule" }] } },
            { legende: "Il repart et monte <b>plus haut</b>, vers 4 150 $ : c'est <b>la tête</b>. Puis il redescend au même endroit que la première fois.", cfg: { bougies: tete, jusqua: 28, unite: "jour", notes: [{ i: 11, prix: 4060, texte: "Épaule" }, { i: 22, prix: 4150, texte: "Tête" }] } },
            { legende: "Troisième sommet, mais <b>plus bas</b> que la tête, vers 4 060 $ : <b>l'épaule droite</b>. Les acheteurs s'essoufflent.", cfg: { bougies: tete, jusqua: 34, unite: "jour", notes: [{ i: 11, prix: 4060, texte: "Épaule" }, { i: 22, prix: 4150, texte: "Tête" }, { i: 32, prix: 4062, texte: "Épaule" }] } },
            { legende: "La <b>ligne de cou relie les deux creux</b>, celui d'avant la tête et celui d'après. Ici, elle est presque horizontale, vers 4 000 $. Au-dessus, rien n'est joué.", cfg: { bougies: tete, jusqua: 37, unite: "jour", notes: [{ i: 11, prix: 4060, texte: "Épaule" }, { i: 22, prix: 4150, texte: "Tête" }, { i: 32, prix: 4062, texte: "Épaule" }], traits: [{ de: [16, 4000], a: [27, 4005], prolonger: true, couleur: COU, pointille: true, label: "Ligne de cou" }] } },
            { legende: "Le prix <b>clôture sous la ligne de cou</b> : la figure est confirmée, la tendance peut se retourner.", cfg: { bougies: tete, jusqua: 40, unite: "jour", surligne: [39], notes: [{ i: 22, prix: 4150, texte: "Tête" }], traits: [{ de: [16, 4000], a: [27, 4005], prolonger: true, couleur: COU, pointille: true, label: "Ligne de cou" }] } },
            { legende: "Ici, la baisse suit. Une fois encore, ce n'était pas écrit d'avance.", cfg: { bougies: tete, unite: "jour", notes: [{ i: 22, prix: 4150, texte: "Tête" }], traits: [{ de: [16, 4000], a: [27, 4005], prolonger: true, couleur: COU, pointille: true, label: "Ligne de cou" }] } },
          ],
        },
        { t: "p", html: "La ligne de cou n'est pas toujours horizontale. Si le deuxième creux est un peu plus haut ou un peu plus bas que le premier, elle penche : on la trace quand même par les deux creux, comme une ligne de tendance (leçon 29), et c'est sa cassure qui compte." },
        { t: "h", texte: "La tête et les épaules inversée" },
        { t: "p", html: "À l'envers, après une baisse, c'est la <span class=\"mot\">tête et épaules inversée</span> (<em>inverse head and shoulders</em>) : trois creux, celui du milieu <b>le plus bas</b>. La ligne de cou relie les deux sommets intermédiaires, et sa cassure <b>vers le haut</b> annonce plutôt une hausse." },
        {
          t: "outil",
          titre: "Retournez la carte",
          consigne: "La tête et les épaules, puis sa version inversée : retournez la carte.",
          el: <CarteFigure
            face={{ titre: "Tête et épaules", texte: "Trois sommets, la tête au milieu plus haute que les épaules, après une hausse. La ligne de cou relie les deux creux. Cassée vers le bas : <b>un retournement à la baisse possible</b>.", cfg: { bougies: tete, notes: [{ i: 11, prix: 4060, texte: "Épaule" }, { i: 22, prix: 4150, texte: "Tête" }, { i: 32, prix: 4062, texte: "Épaule" }], traits: [{ de: [16, 4000], a: [27, 4005], prolonger: true, couleur: COU, pointille: true, label: "Ligne de cou" }] } }}
            dos={{ titre: "Tête et épaules inversée", texte: "Trois creux, la tête au milieu plus basse que les épaules, après une baisse. La ligne de cou relie les deux sommets. Cassée vers le haut : <b>un retournement à la hausse possible</b>.", cfg: { bougies: teteInv, notes: [{ i: 11, prix: 3940, texte: "Épaule", dessous: true }, { i: 22, prix: 3850, texte: "Tête", dessous: true }, { i: 32, prix: 3938, texte: "Épaule", dessous: true }], traits: [{ de: [16, 4000], a: [27, 3995], prolonger: true, couleur: COU, pointille: true, label: "Ligne de cou" }] } }} />,
        },
        { t: "h", texte: "Le triangle : le prix se resserre" },
        { t: "p", html: "Dans un <span class=\"mot\">triangle symétrique</span> (<em>symmetrical triangle</em>), le prix rebondit entre <b>deux lignes qui se rapprochent</b> : des sommets de plus en plus bas, des creux de plus en plus hauts. Acheteurs et vendeurs se rapprochent d'un prix qui leur convient à tous, l'amplitude diminue, et l'énergie s'accumule, comme un ressort qu'on comprime." },
        { t: "p", html: "Puis le prix <b>en sort</b>, souvent avec force. Dans quel sens ? Le triangle symétrique ne le dit pas : <b>c'est la cassure qui donne le sens</b>. Les triangles ont toute une leçon à eux, la leçon 35." },
        {
          t: "scenes",
          titre: "Le prix se resserre, puis sort",
          scenes: [
            { legende: "Des sommets qui baissent, des creux qui montent. On relie les sommets d'un côté, les creux de l'autre : <b>deux lignes qui se rapprochent</b>.", cfg: { bougies: triangle, jusqua: 31, unite: "heure", traits: [{ de: [6, 4100], a: [26, 4060], couleur: R, pointille: true }, { de: [11, 3940], a: [30, 3998], couleur: V, pointille: true }] } },
            { legende: "Le prix s'approche de la pointe. Personne ne sait encore de quel côté il va sortir.", cfg: { bougies: triangle, jusqua: 32, unite: "heure", traits: [{ de: [6, 4100], a: [36, 4040], couleur: R, pointille: true }, { de: [11, 3940], a: [36, 4018], couleur: V, pointille: true }] } },
            { legende: "Une bougie <b>clôture au-dessus de la ligne du haut</b> : la cassure donne le sens, ici la hausse.", cfg: { bougies: triangle, jusqua: 34, unite: "heure", surligne: [34], traits: [{ de: [6, 4100], a: [36, 4040], couleur: R, pointille: true }, { de: [11, 3940], a: [36, 4018], couleur: V, pointille: true }] } },
            { legende: "La sortie est rapide, comme souvent après un resserrement.", cfg: { bougies: triangle, unite: "heure", traits: [{ de: [6, 4100], a: [36, 4040], couleur: R, pointille: true }, { de: [11, 3940], a: [36, 4018], couleur: V, pointille: true }] } },
          ],
        },
        {
          t: "graphique",
          cfg: { bougies: triangleBas, unite: "heure", traits: [{ de: [6, 3940], a: [36, 4000], couleur: V, pointille: true }, { de: [11, 4100], a: [36, 4022], couleur: R, pointille: true }] },
          legende: "Le même triangle aurait pu sortir par le bas. Avant la cassure, les deux sens sont possibles : c'est pour ça qu'on attend.",
        },
        { t: "h", texte: "La fausse cassure" },
        { t: "p", html: "Attention : le prix peut casser une ligne, puis <b>revenir de l'autre côté</b>, comme si de rien n'était. C'est une <span class=\"mot\">fausse cassure</span> (<em>false breakout</em>, leçon 30). Ceux qui étaient entrés sur la cassure se retrouvent piégés, et leur sortie précipitée accélère souvent le mouvement inverse." },
        {
          t: "scenes",
          titre: "Une cassure qui n'en était pas une",
          scenes: [
            { legende: "Deux fois, le prix bute sous 4 100 $ : une résistance.", cfg: { bougies: fausse, jusqua: 29, unite: "heure", niveaux: [{ prix: 4100, label: "Résistance", couleur: R }] } },
            { legende: "Une grande bougie clôture au-dessus. Ça ressemble à une cassure, et un trader achète, avec un stop loss sous la résistance, à 4 075 $.", cfg: { bougies: fausse, jusqua: 31, unite: "heure", niveaux: [{ prix: 4100, label: "Résistance", couleur: R }, { prix: 4075, label: "Stop loss", couleur: "var(--cap-ink-2)" }], marques: [{ i: 31, type: "achat", prix: fausse[31].c, label: "Achat" }] } },
            { legende: "Dès la bougie suivante, le prix revient sous 4 100 $ et touche le stop : <b>c'était une fausse cassure</b>. La perte est petite, et elle était prévue.", cfg: { bougies: fausse, jusqua: 33, unite: "heure", niveaux: [{ prix: 4100, label: "Résistance", couleur: R }, { prix: 4075, label: "Stop loss", couleur: "var(--cap-ink-2)" }], marques: [{ i: 31, type: "achat", prix: fausse[31].c, label: "Achat" }, { i: 32, type: "croix", prix: 4075 }] } },
            { legende: "Sans stop, il aurait regardé le prix fondre jusqu'à 3 950 $. Avec, il est sorti vite, et il attend la prochaine occasion.", cfg: { bougies: fausse, unite: "heure", niveaux: [{ prix: 4100, label: "Résistance", couleur: R }, { prix: 4075, label: "Stop loss", couleur: "var(--cap-ink-2)" }], marques: [{ i: 31, type: "achat", prix: fausse[31].c, label: "Achat" }, { i: 32, type: "croix", prix: 4075 }] } },
          ],
        },
        { t: "h", texte: "Jamais une garantie, toujours un stop loss" },
        { t: "p", html: "Toutes les figures de cette leçon échouent régulièrement. Une figure confirmée peut repartir dans l'autre sens, une cassure peut être fausse. C'est pourquoi chaque trade sur une figure a son <span class=\"mot\">stop loss</span> (<em>stop loss</em>, leçon 20) : l'ordre qui coupe la perte au prix où la figure n'a plus de sens." },
        {
          t: "liste", items: [
            "Double sommet, tête et épaules : le stop se place <b>au-dessus du dernier sommet</b> (le deuxième sommet, ou l'épaule droite). Si le prix y remonte, la figure est ratée.",
            "Double creux, tête et épaules inversée : le stop se place <b>sous le dernier creux</b>.",
            "Triangle : le stop se place <b>de l'autre côté du triangle</b>, sous la ligne du bas après une cassure par le haut.",
          ],
        },
        {
          t: "exemple",
          html: "Un double sommet sur l'or : sommets à <b>4 120 $</b>, ligne de cou à <b>4 030 $</b>. Une bougie clôture à <b>4 020 $</b> : vous vendez (un short, leçon 15) à 4 020 $, avec un stop au-dessus du deuxième sommet, à <b>4 125 $</b>. Le risque est de 105 $ par once. Avec un compte de 2 000 $ et 1 % de risque, soit 20 $, vous ne pouvez exposer qu'environ <b>0,19 once</b> (20 ÷ 105), soit moins d'un micro-lot (1 once) : la figure est trop grande pour ce compte, et ce n'est pas grave. Une figure qui ne rentre pas dans votre risque, on la regarde, on ne la trade pas. Sur un graphique en 15 minutes, la même figure fait peut-être 15 $ de haut, et là, le calcul devient possible (leçon 19).",
        },
        { t: "piege", html: "<b>Voir des figures partout.</b> Quand on vient d'apprendre la tête et les épaules, on en trouve sur chaque graphique. Exigez un dessin net, qui saute aux yeux sans plisser les yeux, et attendez la cassure. Une figure qu'il faut chercher longtemps n'en est pas une." },
        {
          t: "outil",
          titre: "Quelle figure ?",
          consigne: "Cinq graphiques. Pour chacun, choisissez le nom de la figure. La correction trace ses lignes.",
          el: <QuelleFigure questions={[
            { cfg: { bougies: q1 }, options: ["Un double sommet", "Un double creux", "Un triangle"], correct: 0, explication: "Deux sommets au même niveau, vers 4 095 $, puis le prix casse la ligne de cou qui passe par le creux du milieu.", correction: { niveaux: [{ prix: 4095, label: "Résistance", couleur: R }, { prix: 4030, label: "Ligne de cou", couleur: COU }] } },
            { cfg: { bougies: q2 }, options: ["Un double sommet", "Une tête et épaules", "Un triangle"], correct: 1, explication: "Trois sommets, et celui du milieu dépasse nettement les deux autres : la tête et ses deux épaules. La ligne de cou relie les deux creux.", correction: { traits: [{ de: [15, 3995], a: [26, 3998], prolonger: true, couleur: COU, pointille: true, label: "Ligne de cou" }] } },
            { cfg: { bougies: q3 }, options: ["Un double sommet", "Une tête et épaules inversée", "Un double creux"], correct: 2, explication: "Deux creux au même niveau, après une baisse, puis la cassure vers le haut de la ligne de cou, qui passe par le sommet du milieu.", correction: { niveaux: [{ prix: 3910, label: "Support", couleur: V }, { prix: 3980, label: "Ligne de cou", couleur: COU }] } },
            { cfg: { bougies: q4 }, options: ["Un triangle", "Un double sommet", "Une tête et épaules"], correct: 0, explication: "Des sommets de plus en plus bas, des creux de plus en plus hauts : deux lignes qui se rapprochent. Ici, la cassure se fait par le bas.", correction: { traits: [{ de: [5, 4090], a: [25, 4055], couleur: R, pointille: true }, { de: [10, 3950], a: [29, 3998], couleur: V, pointille: true }] } },
            { cfg: { bougies: q5 }, options: ["Un double creux", "Une tête et épaules inversée", "Un triangle"], correct: 1, explication: "Trois creux, celui du milieu le plus bas, après une baisse : la version inversée. La cassure de la ligne de cou se fait vers le haut.", correction: { traits: [{ de: [15, 4000], a: [26, 3997], prolonger: true, couleur: COU, pointille: true, label: "Ligne de cou" }] } },
          ]} />,
        },
        { t: "nimbo", texte: "Sur la page Analyse, ouvrez le graphique d'un actif en journalier et cherchez un double sommet ou un double creux net. Puis demandez-vous : où passe la ligne de cou, et a-t-elle été cassée en clôture ?", humeur: "pointe" },
      ],
    },
  ],
  mots: [
    { terme: "Figure chartiste", en: "chart pattern", def: "Un dessin que le prix fait souvent sur un graphique, et qui annonce parfois la suite." },
    { terme: "Double sommet", en: "double top", def: "Deux sommets au même niveau après une hausse, sur une résistance ; confirmé quand le prix casse la ligne de cou vers le bas." },
    { terme: "Double creux", en: "double bottom", def: "Deux creux au même niveau après une baisse, sur un support ; confirmé quand le prix casse la ligne de cou vers le haut." },
    { terme: "Ligne de cou", en: "neckline", def: "La ligne qui passe par le creux (ou les creux) entre les sommets d'une figure ; sa cassure confirme la figure." },
    { terme: "Tête et épaules", en: "head and shoulders", def: "Trois sommets, celui du milieu le plus haut ; une figure de retournement possible après une hausse. À l'envers (inverse head and shoulders), après une baisse." },
    { terme: "Triangle symétrique", en: "symmetrical triangle", def: "Le prix rebondit entre deux lignes qui se rapprochent, puis en sort ; la cassure donne le sens." },
    { terme: "Cassure", en: "breakout", def: "Le prix clôture au-delà d'une ligne ou d'un niveau." },
    { terme: "Fausse cassure", en: "false breakout", def: "Le prix casse une ligne, puis revient de l'autre côté : ceux qui sont entrés sur la cassure sont piégés." },
    { terme: "Stop loss", en: "stop loss", def: "L'ordre qui ferme la position au prix où l'idée devient fausse, pour que la perte reste petite." },
  ],
  retenir: [
    "Une <b>figure chartiste</b> est un dessin que le prix fait souvent : elle annonce <b>parfois</b> la suite, jamais à coup sûr.",
    "Le <b>double sommet</b> : deux sommets au même niveau sur une résistance. Le <b>double creux</b> : le même dessin à l'envers.",
    "La <b>ligne de cou</b> passe par le creux du milieu (ou relie les deux creux). <b>Sans cassure en clôture, pas de figure.</b>",
    "La <b>tête et les épaules</b> : trois sommets, la tête plus haute ; un retournement possible. Sa version <b>inversée</b> suit une baisse.",
    "Le <b>triangle</b> : deux lignes qui se rapprochent, puis une sortie souvent forte ; <b>c'est la cassure qui donne le sens</b>.",
    "Une cassure peut être <b>fausse</b> : chaque trade sur une figure a son <b>stop loss</b>, placé là où la figure n'a plus de sens.",
  ],
  quiz: [
    { question: "Le prix a fait deux sommets à 4 120 $, avec un creux à 4 030 $ entre les deux. Il est maintenant à 4 060 $. La figure est-elle confirmée ?", options: ["Oui, deux sommets suffisent", "Non, il faut une clôture sous 4 030 $", "Oui, puisque le prix baisse"], correct: 1, explanation: "Tant que le prix reste au-dessus de la ligne de cou, rien n'est sûr : il peut repartir vers le haut. C'est la clôture sous la ligne de cou qui confirme le double sommet." },
    { question: "Dans un double creux, par où passe la ligne de cou ?", options: ["Par les deux creux", "Par le sommet entre les deux creux", "Par le plus haut du graphique"], correct: 1, explanation: "Dans un double creux, la ligne de cou passe par le sommet du milieu. Sa cassure vers le haut confirme la figure." },
    { question: "Qu'est-ce qui distingue la tête et les épaules d'un simple enchaînement de trois sommets ?", options: ["Le sommet du milieu est le plus haut, les deux autres à peu près au même niveau", "Les trois sommets sont exactement au même prix", "Le troisième sommet est le plus haut"], correct: 0, explanation: "La tête, au milieu, dépasse les deux épaules. Une épaule droite plus basse que la tête montre des acheteurs à bout de souffle." },
    { question: "Le prix se resserre dans un triangle symétrique. Dans quel sens va-t-il sortir ?", options: ["Toujours vers le haut", "Toujours vers le bas", "On ne le sait qu'à la cassure"], correct: 2, explanation: "Le triangle symétrique ne donne pas le sens : il dit qu'un mouvement se prépare. C'est la cassure qui le donne, et elle peut encore être fausse." },
    { question: "Vous vendez sur la cassure de la ligne de cou d'une tête et épaules. Où placer le stop loss ?", options: ["Aucun, la figure est confirmée", "Au-dessus de l'épaule droite", "Juste sous votre prix de vente"], correct: 1, explanation: "Si le prix remonte au-dessus de l'épaule droite, la figure est ratée : c'est là que votre idée devient fausse. Une figure n'est jamais une garantie." },
  ],
  pratique: [
    { texte: "Cherchez un double sommet ou un double creux sur le graphique d'un actif, et tracez sa ligne de cou.", href: "/analysis", bouton: "Ouvrir l'analyse" },
    { texte: "Sur une figure confirmée, placez un trade fictif avec son stop loss au bon endroit.", href: "/trading", bouton: "Prendre position" },
  ],
};

export default lecon;
