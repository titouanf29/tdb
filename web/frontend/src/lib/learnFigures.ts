import type { Module } from "./learnContent";

/**
 * Le cours sur les figures chartistes.
 *
 * Il suit une règle que les vidéos ne suivent pas : chaque figure est
 * d'abord montrée et nommée proprement — pour qu'on sache la reconnaître,
 * parce qu'on la verra partout — puis confrontée à ce qu'elle a réellement
 * donné sur nos propres données. Les chiffres ne sont pas écrits ici : les
 * blocs [[mesure:…]] les lisent sur le serveur, là où le graphique de
 * l'Analyse les lit aussi. Le cours ne peut donc pas contredire l'écran.
 */
export const MODULE_FIGURES: Module = {
  id: "figures-chartistes",
  title: "Les figures chartistes, sans légende",
  description:
    "Double sommet, épaule-tête-épaule, triangles, drapeaux : les reconnaître, comprendre ce qu'elles promettent — et voir ce qu'elles ont vraiment donné sur dix ans de données.",
  icon: "📐",
  color: "from-primary/20 to-neon-cyan/20 border-primary/30",
  level: "all",
  lessons: [
    // ── 1 ─────────────────────────────────────────────────────────────────
    {
      id: "pourquoi",
      title: "Pourquoi tout le monde en parle",
      duration: "7 min",
      keyPoints: [
        "Une figure est une forme que le prix dessine, à laquelle on prête une suite",
        "Elle n'existe qu'une fois CASSÉE : avant, ce n'est qu'un dessin",
        "La seule question qui compte : fait-elle mieux que le hasard ?",
        "Le hasard n'est pas 50 % : sur un marché haussier, le prix monte déjà plus souvent qu'il ne baisse",
        "Une vidéo montre les figures qui ont marché — jamais celles qui ont échoué",
      ],
      content: `Sur les réseaux, la scène est toujours la même : un graphique, une forme surlignée — deux sommets, une « tête » entre deux « épaules », un triangle — puis une flèche, et le prix qui part exactement dans le sens annoncé. C'est convaincant, et c'est fait pour.

Une **figure chartiste** est une forme que le prix dessine sur un graphique, à laquelle on associe une suite probable. Le double sommet « annonce » une baisse, le double creux une hausse, et ainsi de suite. Ces figures ont des noms, des règles de tracé, et un siècle d'histoire.

**Trois choses que les vidéos ne disent pas.**

• **Une figure n'existe qu'au moment où elle casse.** Deux sommets à la même hauteur, c'est un dessin. Ça devient un double sommet quand le prix passe sous le creux qui les sépare — la « ligne de cou ». Avant, la moitié des « doubles sommets » deviennent autre chose.
• **On ne vous montre que celles qui ont marché.** Une vidéo sélectionne. Pour chaque figure qui a « prédit » la suite, il y en a d'autres, jamais filmées, qui ont fait l'inverse.
• **Le bon repère n'est pas 50 %.** Sur les dix dernières années, le prix de nos 31 actifs a monté 58,8 % du temps à 20 séances. Une figure haussière qui « réussit » 58 % du temps ne fait donc RIEN : c'est la tendance du marché, pas la figure.

**Ce que ce cours fait différemment.** Pour chaque figure : sa forme, ses repères, ce qu'elle promet — puis ce qu'elle a réellement donné. Nous avons détecté plus de 2 000 figures sur 31 actifs (actions, indices, matières premières, devises, crypto) et dix ans de données, et compté ce qui s'est passé après chacune.

Nous avons aussi vérifié notre propre outil. Sur des séries fabriquées au hasard — où, par construction, rien ne peut être prédit — notre détecteur trouve autant de figures que sur les vrais marchés, et elles « réussissent » exactement une fois sur deux. C'est la preuve que la détection ne triche pas en regardant l'avenir. Et c'est déjà une leçon : **le hasard dessine ces formes tout seul**.

[[mesure:tableau]]

La suite du cours prend les figures une par une. Retenez déjà la colonne de droite.`,
      quiz: [
        {
          question: "À quel moment un double sommet devient-il vraiment une figure ?",
          options: [
            "Dès que le second sommet est formé",
            "Quand le prix casse sous la ligne de cou",
            "Quand le volume augmente",
            "Quand une vidéo le signale",
          ],
          correct: 1,
          explanation: "Deux sommets à la même hauteur ne sont qu'un dessin. La figure n'est confirmée qu'à la cassure de la ligne de cou.",
        },
        {
          question: "Sur un marché qui monte 58,8 % du temps, une figure haussière qui réussit 58 % du temps…",
          options: [
            "est une bonne figure",
            "ne fait pas mieux que le hasard",
            "est meilleure qu'une figure baissière",
            "doit être utilisée avec un levier",
          ],
          correct: 1,
          explanation: "58 % contre 58,8 % par simple tendance du marché : la figure n'apporte rien. Le bon repère est le taux de base, pas 50 %.",
        },
      ],
    },

    // ── 2 ─────────────────────────────────────────────────────────────────
    {
      id: "doubles",
      title: "Double sommet et double creux",
      duration: "6 min",
      keyPoints: [
        "Deux extrêmes à peu près au même niveau, séparés par un retour franc",
        "La ligne de cou passe par le point intermédiaire ; sa cassure confirme",
        "Objectif théorique : la hauteur de la figure, reportée depuis la cassure",
        "Invalidation : un retour au-delà des deux sommets (ou sous les deux creux)",
        "Les plus fréquentes — et elles ne battent pas le hasard",
      ],
      content: `Ce sont les figures les plus fréquentes, et celles qu'on voit le plus souvent en vidéo.

[[schema:double_sommet]]

**Le double sommet** (on dit aussi « M ») : le prix monte, recule, remonte jusqu'au même niveau sans le dépasser, puis redescend. L'idée derrière : les acheteurs ont échoué deux fois au même endroit, ils abandonnent.

• **Les deux sommets** doivent être proches — dans notre détecteur, moins de 3 % d'écart.
• **Le creux** entre les deux doit être franc : un retour d'au moins 2,5 %. Sans lui, ce n'est qu'une hésitation.
• **La ligne de cou** passe par ce creux. Tant qu'elle n'est pas cassée, rien n'est confirmé.
• **L'objectif théorique** : la hauteur entre les sommets et le creux, reportée vers le bas depuis la cassure.
• **L'invalidation** : si le prix repasse au-dessus des sommets, la lecture était fausse.

[[mesure:double_sommet]]

[[schema:double_creux]]

**Le double creux** (« W ») est le miroir : deux creux au même niveau, un sommet entre les deux, et une cassure vers le haut. Même logique, sens inverse.

[[mesure:double_creux]]

**Comment lire ces chiffres.** Le double creux « réussit » à peu près aussi souvent que le marché monte tout seul. Le double sommet « réussit » à peu près aussi souvent que le marché baisse tout seul. Sur plus de 1 200 cas, l'écart avec le hasard reste dans la marge d'erreur, et il change de signe d'une période à l'autre.

Autrement dit : quand vous voyez un double creux, vous savez qu'il y a eu deux creux. Vous n'en savez pas plus sur la suite.`,
      quiz: [
        {
          question: "Où place-t-on l'invalidation d'un double sommet ?",
          options: [
            "Sous la ligne de cou",
            "Au-dessus des deux sommets",
            "Au niveau de l'objectif",
            "Il n'y en a pas",
          ],
          correct: 1,
          explanation: "Si le prix repasse au-dessus des sommets, l'idée « les acheteurs ont échoué deux fois » est fausse.",
        },
        {
          question: "Que dit notre mesure sur plus de 1 200 doubles sommets et doubles creux ?",
          options: [
            "Ils prédisent la suite dans 80 % des cas",
            "Ils ne se distinguent pas du hasard",
            "Seul le double creux fonctionne",
            "Ils fonctionnent uniquement sur la crypto",
          ],
          correct: 1,
          explanation: "L'écart avec le taux de base reste dans la marge d'erreur et change de signe d'une période à l'autre.",
        },
      ],
    },

    // ── 3 ─────────────────────────────────────────────────────────────────
    {
      id: "ete",
      title: "Épaule-tête-épaule",
      duration: "6 min",
      keyPoints: [
        "Trois sommets : le central (la tête) dépasse les deux autres (les épaules)",
        "La ligne de cou relie les deux creux ; elle peut être inclinée",
        "Objectif : la hauteur tête–ligne de cou, reportée depuis la cassure",
        "Invalidation : un retour au-dessus de la tête",
        "La plus célèbre des figures — et aucun avantage mesurable",
      ],
      content: `C'est la figure la plus célèbre, celle qu'on cite comme le « signal de retournement » par excellence.

[[schema:ete]]

**L'épaule-tête-épaule** (ETE) : trois sommets. Celui du milieu, la **tête**, dépasse nettement les deux autres, les **épaules**, qui sont à peu près à la même hauteur. Entre eux, deux creux.

• **La ligne de cou** relie les deux creux. Elle n'est pas forcément horizontale — et la forcer à l'horizontale fait rater la moitié des cas réels.
• **La confirmation** : une clôture sous la ligne de cou, prolongée jusqu'au jour de la cassure.
• **L'objectif** : la distance entre la tête et la ligne de cou, reportée vers le bas.
• **L'invalidation** : un retour au-dessus de la tête.

L'histoire qu'on raconte : le marché fait un dernier sommet plus haut (la tête), échoue à le refaire (la seconde épaule), et bascule.

[[mesure:ete]]

[[schema:ete_inversee]]

**L'ETE inversée** est le miroir, au creux d'une baisse : trois creux, le central plus bas que les deux autres, et une cassure vers le haut.

[[mesure:ete_inversee]]

**Pourquoi c'est intéressant malgré tout.** L'ETE est rare : un peu plus de 100 cas sur dix ans et 31 actifs, pour la version baissière. C'est justement pour ça qu'elle impressionne quand on la voit marcher en vidéo — et pour ça que ses chiffres ont une grosse marge d'erreur. Sur une période elle semble fonctionner, sur l'autre elle fait l'inverse : c'est la signature du bruit.`,
      quiz: [
        {
          question: "Dans une épaule-tête-épaule, la ligne de cou relie…",
          options: [
            "Les deux épaules",
            "La tête et la première épaule",
            "Les deux creux entre les sommets",
            "Le début et la fin de la figure",
          ],
          correct: 2,
          explanation: "La ligne de cou passe par les deux creux, et elle peut être inclinée.",
        },
        {
          question: "Un résultat qui semble bon sur une période et mauvais sur une autre, c'est plutôt…",
          options: [
            "Une figure qui fonctionne par cycles",
            "La signature du bruit",
            "Une preuve que la figure marche",
            "Un problème de données",
          ],
          correct: 1,
          explanation: "Un vrai avantage doit tenir sur des périodes différentes. Un écart qui change de signe est ce que le hasard produit.",
        },
      ],
    },

    // ── 4 ─────────────────────────────────────────────────────────────────
    {
      id: "triangles",
      title: "Les triangles",
      duration: "7 min",
      keyPoints: [
        "Deux droites qui se rapprochent : le prix se comprime",
        "Ascendant : plafond plat, creux qui montent — réputé haussier",
        "Descendant : plancher plat, sommets qui baissent — réputé baissier",
        "Symétrique : les deux côtés convergent — c'est la sortie qui donne le sens",
        "Le triangle ascendant a semblé marcher… puis la vérification l'a démenti",
      ],
      content: `Un triangle, c'est un marché qui se comprime : les mouvements rétrécissent, jusqu'à ce que le prix sorte d'un côté.

[[schema:triangle_ascendant]]

**Le triangle ascendant** : un plafond plat (le prix bute plusieurs fois au même niveau) et des creux de plus en plus hauts. Les acheteurs reviennent de plus en plus tôt ; on s'attend à ce qu'ils finissent par percer le plafond.

• **Plat** veut dire qu'un côté bouge de moins d'un quart de la hauteur du triangle sur toute sa durée.
• **La confirmation** est la sortie : une clôture au-dessus du plafond.
• **L'objectif** : la hauteur de départ du triangle, reportée depuis la sortie.
• **L'invalidation** : un retour sous le dernier creux.

[[mesure:triangle_ascendant]]

**Une histoire instructive.** Lors de notre première mesure, le triangle ascendant semblait nettement meilleur que le hasard : près de 9 points d'écart. En vérifiant, nous avons trouvé un défaut dans notre détecteur de triangles, et nous avons ajouté une exigence : l'écart doit tenir sur les DEUX moitiés de l'historique. Résultat : environ −4 points sur la première moitié, +12 sur la seconde. Il n'y avait pas de signal — seulement du bruit tombé du bon côté.

C'est exactement comme ça que naissent les « astuces » : quelqu'un teste sur une période, trouve un résultat, et s'arrête là.

[[schema:triangle_descendant]]

**Le triangle descendant** est le miroir : un plancher plat, des sommets de plus en plus bas, et une sortie attendue vers le bas.

[[mesure:triangle_descendant]]

Regardez la dernière ligne : son objectif est rarement atteint avant son invalidation. Même quand le prix part dans le « bon » sens, il ne va presque jamais aussi loin que la figure le promet.

[[schema:triangle_symetrique]]

**Le triangle symétrique** : les sommets baissent ET les creux montent. Il ne promet aucun sens à l'avance — c'est la sortie qui le donne.

[[mesure:triangle_symetrique]]`,
      quiz: [
        {
          question: "Qu'est-ce qui distingue un triangle ascendant ?",
          options: [
            "Des sommets et des creux qui montent tous",
            "Un plafond plat et des creux de plus en plus hauts",
            "Un plancher plat et des sommets de plus en plus bas",
            "Trois sommets dont le central est le plus haut",
          ],
          correct: 1,
          explanation: "Plafond plat, creux ascendants : le prix se comprime sous une résistance.",
        },
        {
          question: "Pourquoi exiger qu'un résultat tienne sur deux périodes séparées ?",
          options: [
            "Pour avoir plus de données",
            "Parce qu'un écart trouvé sur une seule période peut être dû au hasard",
            "Parce que les marchés changent tous les cinq ans",
            "Ce n'est pas nécessaire",
          ],
          correct: 1,
          explanation: "En testant neuf figures, l'une d'elles semblera marcher par pure chance sur une période. Qu'elle marche aussi sur l'autre est beaucoup plus difficile à obtenir par hasard.",
        },
      ],
    },

    // ── 5 ─────────────────────────────────────────────────────────────────
    {
      id: "drapeaux",
      title: "Les drapeaux",
      duration: "5 min",
      keyPoints: [
        "Un mât : une impulsion franche sur peu de bougies",
        "Une pause étroite, qui dérive légèrement contre l'impulsion",
        "Réputé annoncer une reprise dans le sens du mât",
        "Invalidation : la sortie de la pause du mauvais côté",
        "Souvent invalidé avant d'atteindre son objectif",
      ],
      content: `Le drapeau est une figure de **continuation** : elle ne prétend pas annoncer un retournement, mais la reprise d'un mouvement déjà en cours.

[[schema:drapeau_haussier]]

**Le drapeau haussier** : une hausse brutale — le **mât**, au moins 6 % en quelques bougies — puis une **pause** étroite qui dérive un peu vers le bas. L'idée : le marché reprend son souffle avant de repartir.

• **La pause** doit rester étroite : moins d'un tiers de la hauteur du mât. Au-delà, ce n'est plus une pause, c'est un repli.
• **La confirmation** : une sortie au-dessus de la pause.
• **L'objectif théorique** : la hauteur du mât, reportée depuis la sortie.
• **L'invalidation** : une sortie de la pause par le bas.

[[mesure:drapeau_haussier]]

[[schema:drapeau_baissier]]

**Le drapeau baissier** est le miroir : une chute brutale, une pause qui remonte légèrement, puis une reprise attendue de la baisse.

[[mesure:drapeau_baissier]]

**À retenir** : l'objectif du drapeau — « la hauteur du mât » — est ambitieux, et il est plus souvent invalidé qu'atteint. Un mouvement violent est souvent suivi… d'un autre mouvement violent, dans n'importe quel sens.`,
      quiz: [
        {
          question: "Dans un drapeau haussier, la pause doit…",
          options: [
            "Monter plus vite que le mât",
            "Rester étroite et dériver légèrement vers le bas",
            "Durer plus longtemps que la hausse",
            "Former un double creux",
          ],
          correct: 1,
          explanation: "Une pause étroite qui dérive contre l'impulsion : au-delà d'un tiers du mât, c'est un repli, pas une pause.",
        },
      ],
    },

    // ── 6 ─────────────────────────────────────────────────────────────────
    {
      id: "s-en-servir",
      title: "Ce qu'on peut en faire quand même",
      duration: "6 min",
      keyPoints: [
        "Une figure décrit le passé ; elle ne prédit pas la suite",
        "Sa vraie utilité : donner un point d'invalidation clair pour placer un stop",
        "Ne jamais entrer « parce qu'il y a une figure »",
        "Se méfier de tout résultat présenté sans son taux de base",
        "Tester soi-même : le simulateur est fait pour ça",
      ],
      content: `Si aucune figure ne bat le hasard, pourquoi les apprendre ? Pour trois raisons, et aucune n'est « pour prédire ».

**1. Pour ne plus être impressionné.** Vous les verrez partout — en vidéo, dans des forums, dans des newsletters payantes. Savoir ce qu'est réellement un double sommet, et savoir qu'il ne fait pas mieux que le hasard, c'est la meilleure protection contre ceux qui vendent des « signaux ».

**2. Pour placer un stop, pas pour décider d'entrer.** Une figure a un avantage réel, qui n'a rien de magique : elle désigne un prix précis où la lecture devient fausse. Si vous avez déjà une raison d'acheter, le creux d'un double creux est un endroit logique pour votre stop : sous ce niveau, l'histoire que vous vous racontiez est démentie. C'est de la gestion du risque, pas de la prédiction.

**3. Pour comprendre ce que les autres regardent.** Beaucoup d'intervenants surveillent ces niveaux. Ça ne les rend pas prédictifs — nos chiffres le montrent — mais ça explique pourquoi le prix hésite parfois autour d'eux.

**Les réflexes à garder.**

• **Devant tout pourcentage de réussite, demandez le taux de base.** « 60 % de réussite » ne veut rien dire sur un marché qui monte déjà 59 % du temps.
• **Demandez sur combien de cas, et sur quelle période.** Dix exemples choisis ne prouvent rien ; mille cas sur une seule année haussière non plus.
• **Méfiez-vous des objectifs.** Même dans le « bon » sens, le prix atteint rarement l'objectif théorique avant l'invalidation.
• **Testez vous-même.** Dans le Wallet, ouvrez des positions sur des figures que vous repérez, notez-les dans le Journal, et regardez le bilan après une vingtaine de trades. C'est exactement ce que nous avons fait — à plus grande échelle.

**Dans l'Analyse**, le graphique commenté dessine les figures qu'il trouve sur la période affichée, et écrit à côté ce qu'elles ont donné. Vous pouvez les masquer d'un clic. Vous savez maintenant comment lire ce qui est écrit dessous.`,
      quiz: [
        {
          question: "Quel usage d'une figure est défendable ?",
          options: [
            "Entrer en position dès qu'elle apparaît",
            "S'en servir pour placer un stop à son point d'invalidation",
            "Augmenter le levier quand elle est nette",
            "Vendre toutes ses positions sur un double sommet",
          ],
          correct: 1,
          explanation: "Une figure ne prédit pas, mais elle désigne un prix où la lecture devient fausse : c'est un repère utile pour le risque.",
        },
        {
          question: "On vous annonce une stratégie « à 62 % de réussite ». Première question à poser ?",
          options: [
            "Combien coûte l'abonnement",
            "Quel est le taux de base sur la même période",
            "Quel indicateur elle utilise",
            "Si elle marche sur le Bitcoin",
          ],
          correct: 1,
          explanation: "Sans le taux de base, un pourcentage de réussite ne dit rien : la simple tendance du marché peut expliquer les 62 %.",
        },
      ],
    },
  ],
};
