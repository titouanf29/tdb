import { serie, type Bougie } from "../marche";
import type { LeconSerie } from "../types";
import { SlippageDirect } from "@/components/cours/outils/SlippageDirect";
import { CarnetOrdres } from "@/components/cours/outils/CarnetOrdres";
import { GapStop } from "@/components/cours/outils/GapStop";

// Le vendredi (bougies 0 à 23, d'une heure) : achat à 1,1000 (bougie 14), clôture à 1,0995.
const vendredi = serie([[0, 1.1012], [8, 1.1004], [14, 1.1000], [19, 1.0988], [23, 1.0995]], { graine: 221, bruit: 0.0004 });
// Le lundi : le marché rouvre à 1,0970, sous le stop de 1,0980.
const lundi = serie([[0, 1.0968], [5, 1.0956], [11, 1.0962]], { graine: 222, bruit: 0.0004 });
const gap: Bougie[] = [...vendredi, ...lundi.map((b, i) => (i === 0 ? { ...b, o: 1.097, h: Math.max(b.h, 1.097) } : b))];
// Une annonce : le prix saute de 1,1000 à 1,1030 en une minute.
const annonce = serie([[0, 1.0998], [14, 1.1001], [24, 1.0999], [27, 1.1000], [28, 1.1031, "haut"], [31, 1.1018], [36, 1.1026], [42, 1.1021]], { graine: 223, bruit: 0.0003, meche: 1.2 });

const ENTREE = { prix: 1.1, label: "Achat 1,1000", couleur: "var(--cap-ink)", pointille: false };
const STOP = { prix: 1.098, label: "Stop 1,0980", couleur: "var(--cap-down)", pointille: false, epaisseur: 2 };

const lecon: LeconSerie = {
  numero: 22,
  accroche: "Vous cliquez sur Acheter, et votre position s'ouvre plus haut que le prix affiché. Ce n'est pas une erreur.",
  promesse: "À la fin de cette leçon, vous saurez d'où vient le slippage, quand il frappe, ce qu'il fait à votre stop pendant un gap, et comment le limiter.",
  parties: [{
    titre: "",
    blocs: [
      { t: "h", texte: "Le prix demandé, le prix obtenu" },
      { t: "p", html: "Le <span class=\"mot\">slippage</span> (en français, le glissement) est <b>l'écart entre le prix que vous demandez et le prix que vous obtenez</b>. Vous voyez 1,1000 à l'achat, vous cliquez, et votre position s'ouvre à 1,1003. Ce n'est ni un bug ni une arnaque : c'est la façon dont un marché fonctionne." },
      {
        t: "exemple",
        html: "Achat de <b>0,10 lot</b> d'euro-dollar affiché à <b>1,1000</b>, exécuté à <b>1,1003</b> : 3 pips de slippage. Sur 0,10 lot, un pip vaut 1 $ : <b>3 $</b> de plus, avant même que le trade commence. Sur un risque de 20 $, ce n'est pas rien.",
      },

      { t: "h", texte: "D'où il vient : la vitesse" },
      { t: "p", html: "Entre votre clic et l'exécution de l'ordre, il se passe un instant : l'ordre voyage jusqu'au courtier, qui le traite. Une fraction de seconde, souvent. Si le marché est calme, le prix n'a pas le temps de bouger. S'il bouge vite, le prix est déjà parti quand votre ordre arrive, et vous obtenez <b>le prix du moment de l'exécution</b>, pas celui de votre clic." },
      {
        t: "outil",
        titre: "Le slippage en direct",
        consigne: "Achetez plusieurs fois, au calme puis pendant une annonce, au marché puis à cours limité. Les écarts sont tirés au hasard, comme sur un vrai marché.",
        el: <SlippageDirect />,
      },

      { t: "h", texte: "D'où il vient : les ordres en face" },
      { t: "p", html: "Pour acheter, il vous faut un vendeur. Au prix affiché, il y a des vendeurs, mais <b>en quantité limitée</b>. Si votre ordre est plus gros que ce qui est proposé à ce prix, il prend tout, puis passe au prix suivant, un peu plus cher, et ainsi de suite. Cette quantité d'ordres disponibles s'appelle la <span class=\"mot\">liquidité</span>. Beaucoup de liquidité : votre ordre passe au prix affiché. Peu : il glisse." },
      {
        t: "outil",
        titre: "Les vendeurs en face",
        consigne: "Choisissez le carnet et la taille de votre achat au marché. Les barres sombres montrent ce que votre ordre a pris, prix par prix.",
        el: <CarnetOrdres />,
      },
      { t: "p", html: "Pour un particulier qui trade 0,10 lot sur l'euro-dollar, le marché le plus liquide du monde, la liquidité manque rarement au calme. Elle manque aux moments agités, quand les vendeurs retirent leurs ordres en attendant d'y voir clair." },

      { t: "h", texte: "Quand il frappe" },
      {
        t: "liste",
        items: [
          "<b>Pendant une annonce forte</b> (leçon 13) : l'emploi américain, l'inflation, une décision de taux. Le prix peut parcourir 30 pips en une minute.",
          "<b>À la réouverture, après le week-end</b> : le marché ferme le vendredi soir et rouvre le dimanche soir. Entre les deux, les nouvelles s'accumulent.",
          "<b>Aux heures creuses</b>, la nuit pour l'euro-dollar, quand peu d'ordres attendent dans le carnet (leçon 12).",
        ],
      },
      {
        t: "graphique",
        cfg: { bougies: annonce, surligne: [28], niveaux: [{ prix: 1.1, couleur: "var(--cap-ink-3)" }], notes: [{ i: 28, prix: 1.1031, texte: "Annonce" }], unite: "minute" },
        legende: "Des bougies d'une minute ; en pointillé, 1,1000, le prix affiché au moment du clic. L'annonce tombe : la bougie monte de 1,1000 à 1,1030. Un achat au marché envoyé à ce moment peut être exécuté n'importe où dans ce mouvement.",
      },

      { t: "h", texte: "Et votre stop ? Le gap" },
      { t: "p", html: "Un stop loss n'est pas une garantie de prix : c'est un ordre qui, une fois le niveau touché, <b>se transforme en ordre au marché</b> (leçon 14). D'habitude, le prix passe par tous les niveaux intermédiaires, et le stop part tout près de son prix. Mais parfois le prix saute d'un coup, sans passer par les prix entre les deux. Ce trou s'appelle un <span class=\"mot\">gap</span>. Le stop part alors au <b>premier prix disponible</b>." },
      {
        t: "scenes",
        titre: "Le stop pendant un gap",
        scenes: [
          { legende: "Vendredi : vous achetez 0,10 lot à 1,1000.", cfg: { bougies: gap, jusqua: 14, niveaux: [ENTREE], marques: [{ i: 14, type: "achat", label: "Achat" }], unite: "heure" } },
          { legende: "Vous posez votre stop à 1,0980 : <b>20 pips, 20 $</b> de risque.", cfg: { bougies: gap, jusqua: 14, niveaux: [ENTREE, STOP], marques: [{ i: 14, type: "achat", label: "Achat" }], unite: "heure" } },
          { legende: "Le marché ferme le vendredi soir à 1,0995. Le stop n'a pas été touché.", cfg: { bougies: gap, jusqua: 23, niveaux: [ENTREE, STOP], marques: [{ i: 14, type: "achat", label: "Achat" }], notes: [{ i: 23, prix: 1.1004, texte: "Fermeture" }], unite: "heure" } },
          { legende: "Le lundi, il rouvre à <b>1,0970</b>, sous le stop, sans être passé par 1,0980. Le stop part au premier prix disponible : <b>30 pips, 30 $ de perte au lieu de 20 $</b>.", cfg: { bougies: gap, niveaux: [ENTREE, STOP], marques: [{ i: 14, type: "achat", label: "Achat" }, { i: 24, type: "croix", prix: 1.097 }], zones: [{ i0: 23, i1: 24, p0: 1.097, p1: 1.0995, couleur: "var(--cap-down)", label: "Gap" }], unite: "heure" } },
        ],
      },
      {
        t: "outil",
        titre: "Où part votre stop ?",
        consigne: "Choisissez le prix de réouverture du lundi et regardez où le stop est exécuté.",
        el: <GapStop />,
      },
      { t: "p", html: "Le stop a quand même fait son travail : sans lui, la perte aurait continué au-delà de 30 $. Mais il faut savoir qu'<b>un stop limite la perte, il ne la fixe pas au centime près</b>. Garder une position pendant le week-end ou pendant une annonce, c'est accepter ce risque-là." },

      { t: "h", texte: "Il peut aussi jouer pour vous" },
      { t: "p", html: "Le slippage n'est pas toujours contre vous. Si le prix bouge dans votre sens pendant l'instant de l'exécution, vous obtenez <b>un prix un peu meilleur</b> que prévu : on parle de slippage positif. Un courtier sérieux applique les deux, le bon comme le mauvais. Mais aux moments agités, c'est le mauvais qui domine, parce que le prix court justement dans le sens où tout le monde veut aller." },

      { t: "h", texte: "Le bon réflexe" },
      { t: "p", html: "Pour entrer, préférez un <span class=\"mot\">ordre à cours limité</span> (en anglais <em>limit order</em>, leçon 14) : vous fixez votre prix, et l'ordre passe <b>à ce prix ou mieux, jamais plus cher</b>. Plus de slippage contre vous. La contrepartie : si le prix n'y vient pas, l'ordre <b>ne passe pas</b>, et vous ratez peut-être le trade. C'est un bon échange : un trade raté ne coûte rien." },
      {
        t: "tableau",
        entetes: ["", "Ordre au marché", "Ordre à cours limité"],
        lignes: [
          ["Exécution", "Tout de suite, presque toujours", "Seulement si le prix vient à votre limite"],
          ["Prix obtenu", "Celui du moment : parfois moins bon", "Le vôtre, ou mieux"],
          ["Slippage contre vous", "Possible, surtout aux annonces", "Non"],
          ["Le risque", "Payer plus cher que prévu", "Ne pas entrer du tout"],
        ],
      },
      { t: "p", html: "Et <b>juste avant une annonce forte, restez dehors</b> : attendez que le prix se calme, que les ordres reviennent dans le carnet. Le calendrier des annonces vous dit à quelle heure tombent les plus fortes." },
      { t: "piege", html: "<b>Croire que le stop est un prix garanti.</b> Un stop à 20 pips peut coûter 30 pips, ou plus, si le prix saute par-dessus. Certains courtiers proposent un « stop garanti », exécuté à son prix quoi qu'il arrive, contre des frais. Sans lui, gardez en tête que votre perte réelle peut dépasser votre risque prévu, surtout le week-end et aux annonces." },
      {
        t: "qr", items: [
          { q: "Le slippage est-il la faute du courtier ?", r: "Le plus souvent, non : c'est le marché qui a bougé, ou qui manquait de vendeurs. Mais un courtier qui ne vous donnerait que le slippage négatif, jamais le positif, ne serait pas honnête. Comparez vos prix demandés et obtenus dans votre historique." },
          { q: "Le slippage existe-t-il sur un compte démo ?", r: "Souvent moins, voire pas du tout : le compte démo exécute vos ordres sans vrais vendeurs en face. C'est une des différences avec le réel (leçon 23)." },
          { q: "Un ordre à cours limité peut-il glisser ?", r: "Pas contre vous : il passe à votre prix ou mieux. Mais il peut n'être exécuté qu'en partie, ou pas du tout, si le prix ne fait que toucher votre limite." },
          { q: "Comment me protéger du gap du week-end ?", r: "En fermant vos positions le vendredi, ou en réduisant leur taille pour qu'un gap reste supportable. Si vous gardez une position, comptez que la perte peut dépasser le stop." },
        ],
      },
      { t: "nimbo", texte: "Sur l'Agenda macro, je marque les annonces fortes de la semaine, avec leur heure. Juste avant l'une d'elles, c'est souvent le bon moment pour ne rien faire.", humeur: "prudent" },
    ],
  }],
  mots: [
    { terme: "Slippage", en: "slippage", def: "L'écart entre le prix demandé et le prix obtenu : 1,1000 demandé, 1,1003 obtenu, 3 pips." },
    { terme: "Liquidité", en: "liquidity", def: "La quantité d'ordres prêts à être exécutés autour du prix. Beaucoup de liquidité, peu de slippage." },
    { terme: "Gap", en: "gap", def: "Un trou de prix : le prix saute d'un niveau à un autre sans passer par ceux d'entre les deux." },
    { terme: "Ordre à cours limité", en: "limit order", def: "Un ordre exécuté à votre prix ou mieux, jamais plus cher ; mais il peut ne pas passer." },
    { terme: "Ordre au marché", en: "market order", def: "Un ordre exécuté tout de suite, au prix du moment, qui peut différer du prix affiché." },
    { terme: "Slippage positif", en: "positive slippage", def: "Un prix obtenu meilleur que le prix demandé, quand le marché bouge en votre faveur pendant l'exécution." },
  ],
  retenir: [
    "Le <b>slippage</b> est l'écart entre le prix demandé et le prix obtenu : 3 pips, c'est 3 $ sur 0,10 lot.",
    "Il vient de <b>la vitesse</b> (le prix bouge entre le clic et l'exécution) et du <b>manque d'ordres en face</b> (la liquidité).",
    "Il frappe surtout <b>pendant les annonces fortes</b> et <b>à la réouverture après le week-end</b>.",
    "Pendant un <b>gap</b>, le stop part au premier prix disponible : un stop à 20 pips peut coûter <b>30 $ au lieu de 20 $</b>.",
    "Il peut aussi jouer pour vous, mais aux moments agités il joue plutôt contre.",
    "Le bon réflexe : entrer avec un <b>ordre à cours limité</b>, et <b>rester dehors juste avant une annonce forte</b>.",
  ],
  quiz: [
    { question: "Vous achetez 0,10 lot affiché à 1,1000, exécuté à 1,1003. Combien coûte ce slippage ?", options: ["0,30 $", "3 $", "30 $"], correct: 1, explanation: "3 pips de slippage ; sur 0,10 lot, un pip vaut 1 $ : 3 $." },
    { question: "Quand le slippage est-il le plus probable ?", options: ["Au calme, en pleine séance de Londres", "Pendant une annonce forte", "Avec un ordre à cours limité"], correct: 1, explanation: "Pendant une annonce, le prix bouge vite et les vendeurs retirent leurs ordres : vitesse et manque de liquidité, les deux causes à la fois." },
    { question: "Votre stop est à 1,0980. Le lundi, le marché rouvre à 1,0970. Où part le stop ?", options: ["À 1,0980, son prix", "À 1,0970, le premier prix disponible", "Il ne part pas"], correct: 1, explanation: "Le prix a sauté par-dessus le stop. Le stop devient un ordre au marché et part au premier prix disponible : 30 pips au lieu de 20." },
    { question: "Que garantit un ordre d'achat à cours limité à 1,1000 ?", options: ["D'être exécuté à 1,1000 ou moins cher", "D'être exécuté tout de suite", "D'être exécuté quoi qu'il arrive"], correct: 0, explanation: "Il passe à votre prix ou mieux, jamais plus cher. Mais si le prix ne vient pas à 1,1000, il ne passe pas." },
    { question: "Une annonce forte tombe dans deux minutes. Le bon réflexe ?", options: ["Entrer au marché tout de suite", "Rester dehors et attendre que le prix se calme", "Doubler la taille"], correct: 1, explanation: "Juste avant une annonce, le slippage et les gaps guettent. Attendre ne coûte rien." },
  ],
  pratique: [
    { texte: "Repérez les annonces fortes de la semaine et leur heure.", href: "/macro", bouton: "Voir l'agenda macro" },
    { texte: "Notez dans votre journal, pour chaque trade, le prix demandé et le prix obtenu.", href: "/journal", bouton: "Ouvrir le journal" },
  ],
};

export default lecon;
