export type QuizQuestion = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

export type Lesson = {
  id: string;
  title: string;
  duration: string; // e.g. "5 min"
  content: string; // markdown-like rich text (HTML subset)
  keyPoints: string[];
  quiz?: QuizQuestion[];
};

export type Module = {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji
  color: string; // tailwind gradient classes
  level: "beginner" | "intermediate" | "advanced" | "all";
  lessons: Lesson[];
};

export const LEARN_MODULES: Module[] = [
  // ── MODULE 1 ──────────────────────────────────────────────────────────
  {
    id: "trading-basics",
    title: "Les bases du trading",
    description: "Comprendre ce qu'est le trading, les marchés financiers et comment fonctionne l'économie mondiale.",
    icon: "📚",
    color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
    level: "beginner",
    lessons: [
      {
        id: "what-is-trading",
        title: "Qu'est-ce que le trading ?",
        duration: "4 min",
        keyPoints: [
          "Le trading consiste à acheter et vendre des actifs financiers",
          "L'objectif est de réaliser un profit sur la différence de prix",
          "Il existe différents types de marchés : actions, forex, crypto, matières premières",
          "Le trading ≠ investissement à long terme",
        ],
        content: `Le trading est l'acte d'acheter et de vendre des instruments financiers dans le but de réaliser un profit. Contrairement à l'investissement à long terme, le trader cherche à profiter des fluctuations de prix à court ou moyen terme.

Les marchés financiers sont des lieux (physiques ou virtuels) où acheteurs et vendeurs échangent des actifs. Parmi les principaux marchés :

• **Actions** : Parts d'entreprises cotées en bourse (ex: Apple, TotalEnergies)
• **Forex** : Marché des devises (EUR/USD, GBP/JPY...)
• **Crypto-monnaies** : Actifs numériques décentralisés (Bitcoin, Ethereum)
• **Matières premières** : Or, pétrole, blé...
• **Indices** : Panier d'actions représentant une économie (CAC 40, S&P 500)

Le prix d'un actif est déterminé par la loi de l'offre et de la demande. Quand plus de personnes veulent acheter que vendre, le prix monte. L'inverse fait baisser le prix.`,
        quiz: [
          {
            question: "Quelle est la principale différence entre trading et investissement à long terme ?",
            options: [
              "Le trading est toujours plus rentable",
              "Le trader cherche à profiter des fluctuations à court/moyen terme",
              "L'investisseur utilise plus de levier",
              "Le trading ne concerne que les actions",
            ],
            correct: 1,
            explanation: "Le trading vise à profiter des mouvements de prix à court ou moyen terme, tandis que l'investisseur à long terme cherche la croissance sur des années.",
          },
          {
            question: "Qu'est-ce qui détermine le prix d'un actif ?",
            options: [
              "Les banques centrales exclusivement",
              "La loi de l'offre et de la demande",
              "Le gouvernement du pays d'origine",
              "La valeur comptable de l'entreprise",
            ],
            correct: 1,
            explanation: "Le prix est déterminé par l'offre et la demande : quand les acheteurs sont plus nombreux que les vendeurs, le prix monte.",
          },
        ],
      },
      {
        id: "market-participants",
        title: "Les acteurs des marchés",
        duration: "3 min",
        keyPoints: [
          "Les banques centrales influencent les taux d'intérêt",
          "Les institutionnels (fonds, banques) représentent 70%+ des volumes",
          "Les traders particuliers sont les 'retail traders'",
          "Les market makers assurent la liquidité",
        ],
        content: `Les marchés financiers ne sont pas uniquement peuplés de traders individuels. Comprendre qui y opère est essentiel.

**Les banques centrales** (BCE, FED...)
Elles fixent les taux d'intérêt et contrôlent la masse monétaire. Leurs décisions ont un impact massif sur tous les marchés.

**Les investisseurs institutionnels**
Fonds d'investissement, hedge funds, compagnies d'assurance, fonds de pension. Ils gèrent des milliards et représentent la majorité des volumes échangés.

**Les banques commerciales**
Elles tradent pour leur propre compte et pour leurs clients. Elles jouent souvent le rôle de market maker.

**Les market makers**
Ils s'engagent à acheter et vendre en permanence pour assurer la liquidité du marché. Ils gagnent sur le spread (différence entre prix d'achat et de vente).

**Les traders particuliers (retail)**
C'est vous ! Même si individuellement petit, collectivement les retail traders influencent les marchés, surtout en crypto.`,
        quiz: [
          {
            question: "Qui assure la liquidité permanente d'un marché ?",
            options: ["Les traders particuliers", "Les banques centrales", "Les market makers", "Les régulateurs"],
            correct: 2,
            explanation: "Les market makers s'engagent à acheter et vendre en permanence, assurant ainsi qu'il y a toujours une contrepartie disponible.",
          },
        ],
      },
      {
        id: "order-types",
        title: "Les types d'ordres",
        duration: "5 min",
        keyPoints: [
          "Ordre au marché : exécution immédiate au prix actuel",
          "Ordre limite : exécution seulement à un prix précis",
          "Stop Loss : coupe les pertes automatiquement",
          "Take Profit : sécurise les gains automatiquement",
        ],
        content: `Maîtriser les types d'ordres est fondamental pour gérer vos trades correctement.

**Ordre au marché (Market Order)**
Exécution immédiate au meilleur prix disponible. Idéal quand on veut entrer ou sortir rapidement, mais le prix obtenu peut légèrement différer du prix affiché (slippage).

**Ordre limite (Limit Order)**
Vous définissez un prix précis. L'ordre n'est exécuté que si le marché atteint ce prix. Utile pour entrer sur une correction ou sortir à un objectif précis.

**Stop Loss**
Un ordre de vente automatique qui se déclenche si le prix descend en dessous d'un seuil que vous définissez. Il limite vos pertes. TOUJOURS utiliser un stop loss !

**Take Profit**
L'inverse du stop loss : l'ordre se déclenche quand le prix atteint votre objectif de gain. Permet de sécuriser les bénéfices sans surveiller le marché en permanence.

**Stop suiveur (Trailing Stop)**
Un stop loss dynamique qui suit le prix à la hausse. Si le prix monte, le stop monte avec lui. Si le prix baisse, le stop reste en place.`,
        quiz: [
          {
            question: "Vous achetez BTC à 50 000€ et voulez limiter votre perte à 5%. Quel ordre placer ?",
            options: [
              "Un take profit à 47 500€",
              "Un stop loss à 47 500€",
              "Un ordre limite à 52 500€",
              "Un ordre au marché",
            ],
            correct: 1,
            explanation: "Un stop loss à 47 500€ (50 000 × 0.95) coupe automatiquement la position si le prix baisse de 5%, limitant vos pertes.",
          },
          {
            question: "Quelle est la principale différence entre un ordre au marché et un ordre limite ?",
            options: [
              "L'ordre au marché est plus risqué",
              "L'ordre limite garantit l'exécution immédiate",
              "L'ordre au marché s'exécute immédiatement, le limite seulement à un prix précis",
              "L'ordre limite coûte moins cher en frais",
            ],
            correct: 2,
            explanation: "L'ordre au marché s'exécute immédiatement au prix disponible. L'ordre limite attend que le marché atteigne votre prix cible.",
          },
        ],
      },
    ],
  },

  // ── MODULE 2 ──────────────────────────────────────────────────────────
  {
    id: "technical-analysis",
    title: "Analyse technique",
    description: "Lire les graphiques, identifier les tendances et utiliser les indicateurs pour prendre de meilleures décisions.",
    icon: "📊",
    color: "from-purple-500/20 to-violet-500/20 border-purple-500/30",
    level: "beginner",
    lessons: [
      {
        id: "reading-charts",
        title: "Lire un graphique",
        duration: "5 min",
        keyPoints: [
          "Chandelier japonais = OHLC (Open, High, Low, Close)",
          "Bougie verte = clôture > ouverture (hausse)",
          "Bougie rouge = clôture < ouverture (baisse)",
          "Le volume confirme la force d'un mouvement",
        ],
        content: `Le graphique en chandeliers japonais (candlestick) est l'outil de base de tout trader.

**Anatomie d'un chandelier**
Chaque bougie représente une période (1 min, 1h, 1 jour...) et contient 4 informations :
• **Open (O)** : Prix d'ouverture de la période
• **High (H)** : Prix le plus haut atteint
• **Low (L)** : Prix le plus bas atteint
• **Close (C)** : Prix de clôture

**Bougie haussière (verte)**
Le prix de clôture est supérieur au prix d'ouverture. Les acheteurs ont dominé.

**Bougie baissière (rouge)**
Le prix de clôture est inférieur au prix d'ouverture. Les vendeurs ont dominé.

**Les mèches (shadows)**
Les lignes fines au-dessus et en dessous du corps représentent les extrêmes atteints pendant la période. Une longue mèche haute indique que les vendeurs ont repoussé les acheteurs.

**Le volume**
Affiché en bas du graphique, le volume indique combien d'unités ont été échangées. Un mouvement de prix avec un fort volume est plus fiable qu'un mouvement avec peu de volume.`,
        quiz: [
          {
            question: "Une bougie avec un corps vert long et des mèches courtes indique :",
            options: [
              "Une forte pression vendeuse",
              "De l'incertitude sur le marché",
              "Une forte pression acheteuse sur toute la période",
              "Un retournement imminent",
            ],
            correct: 2,
            explanation: "Un corps vert long avec peu de mèches signifie que les acheteurs ont dominé du début à la fin de la période, sans que les vendeurs aient pu reprendre le contrôle.",
          },
        ],
      },
      {
        id: "support-resistance",
        title: "Supports et Résistances",
        duration: "6 min",
        keyPoints: [
          "Support = zone où le prix rebondit à la hausse",
          "Résistance = zone où le prix rebondit à la baisse",
          "Un support cassé devient une résistance et vice versa",
          "Plus une zone est testée, plus elle est significative",
        ],
        content: `Les supports et résistances sont les niveaux clés de tout graphique. Comprendre ces zones change radicalement la façon de trader.

**Le support**
C'est une zone de prix où la demande (acheteurs) est suffisamment forte pour stopper une baisse et potentiellement inverser la tendance. Les traders placent souvent des ordres d'achat à ces niveaux.

Visuellement : le prix "rebondit" plusieurs fois sur cette zone sans la casser.

**La résistance**
C'est l'inverse : une zone où l'offre (vendeurs) stoppe la hausse. Les traders placent leurs prises de profit et ordres de vente à ces niveaux.

**Le principe de polarité**
Quand un support est cassé à la baisse, il devient une résistance. Quand une résistance est cassée à la hausse, elle devient un support. C'est l'un des concepts les plus puissants en analyse technique.

**Comment identifier ces zones ?**
1. Cherchez les zones de congestion (où le prix a consolidé)
2. Repérez les plus hauts et bas significatifs
3. Les niveaux ronds (100, 1000, 50 000...) ont souvent un rôle psychologique
4. Plus une zone a été testée et maintenue, plus elle est forte`,
        quiz: [
          {
            question: "Le prix casse à la baisse un support à 100€. Que devient ce niveau ?",
            options: [
              "Il reste un support",
              "Il devient une résistance",
              "Il n'a plus aucune importance",
              "Il devient un nouveau point d'entrée haussier",
            ],
            correct: 1,
            explanation: "Selon le principe de polarité, un support cassé à la baisse devient une résistance. Les anciens acheteurs piégés vendent dès que le prix remonte à leur niveau d'achat.",
          },
          {
            question: "Qu'est-ce qui rend un niveau de support/résistance plus fiable ?",
            options: [
              "Qu'il soit situé sur un nombre rond",
              "Qu'il ait été testé plusieurs fois sans être cassé",
              "Qu'il soit récent (moins d'une semaine)",
              "Qu'il corresponde à un Fibonacci",
            ],
            correct: 1,
            explanation: "Plus un niveau a été testé et tenu, plus il y a d'ordres accumulés à ce prix, le rendant plus difficile à casser.",
          },
        ],
      },
      {
        id: "trend-indicators",
        title: "Les indicateurs de tendance",
        duration: "7 min",
        keyPoints: [
          "Moyennes mobiles (MA, EMA) lissent le prix",
          "RSI mesure la force d'un mouvement (0-100)",
          "MACD signale les croisements de tendance",
          "Ne jamais utiliser un seul indicateur seul",
        ],
        content: `Les indicateurs techniques sont des outils mathématiques calculés à partir du prix et du volume. Ils aident à identifier la tendance et les zones d'entrée/sortie.

**Moyennes Mobiles (MA / EMA)**
La moyenne mobile calcule le prix moyen sur une période donnée. Elle "lisse" le graphique et révèle la tendance.
• MA 20 : tendance court terme
• MA 50 : tendance moyen terme
• MA 200 : tendance long terme

Quand le prix est au-dessus de sa MA 200, on est en tendance haussière long terme.

**RSI (Relative Strength Index)**
Oscillateur entre 0 et 100 qui mesure la force du mouvement récent.
• RSI > 70 : Zone de surachat (attention à un retournement baissier)
• RSI < 30 : Zone de survente (attention à un rebond haussier)
• RSI = 50 : Neutre

**MACD (Moving Average Convergence Divergence)**
Composé de deux lignes (MACD et signal) et d'un histogramme. Quand la ligne MACD croise la ligne signal à la hausse, c'est un signal d'achat potentiel.

**Attention aux pièges !**
Les indicateurs sont des outils de confirmation, pas de prédiction. Utiliser plusieurs indicateurs qui confirment le même signal augmente la fiabilité.`,
        quiz: [
          {
            question: "Un RSI à 75 signifie :",
            options: [
              "Le prix va forcément monter encore",
              "L'actif est en zone de surachat, un retournement est possible",
              "L'actif est en zone de survente, un rebond est probable",
              "Le volume est insuffisant pour trader",
            ],
            correct: 1,
            explanation: "RSI > 70 indique une zone de surachat, ce qui signifie que le mouvement haussier a peut-être été excessif et qu'un retournement ou une correction est possible.",
          },
        ],
      },
    ],
  },

  // ── MODULE 3 ──────────────────────────────────────────────────────────
  {
    id: "risk-management",
    title: "Gestion du risque",
    description: "La règle n°1 du trading : protéger son capital. Apprenez à dimensionner vos positions et gérer vos pertes.",
    icon: "🛡️",
    color: "from-red-500/20 to-orange-500/20 border-red-500/30",
    level: "beginner",
    lessons: [
      {
        id: "risk-basics",
        title: "Pourquoi la gestion du risque est primordiale",
        duration: "4 min",
        keyPoints: [
          "Perdre 50% nécessite de gagner 100% pour récupérer",
          "La règle des 1-2% : ne jamais risquer plus de 2% du capital par trade",
          "Survivre sur le marché est la priorité absolue",
          "Les pros gagnent en limitant les pertes, pas en devinant les hausse",
        ],
        content: `La gestion du risque est ce qui sépare les traders professionnels des amateurs. La plupart des débutants se concentrent sur les profits potentiels. Les pros se concentrent sur les pertes potentielles.

**La mathématique impitoyable des pertes**
Si vous perdez 10% de votre capital, vous devez gagner 11% pour récupérer.
Si vous perdez 25%, vous devez gagner 33%.
Si vous perdez 50%, vous devez gagner 100% !

C'est pourquoi limiter les pertes est plus important que maximiser les gains.

**La règle des 1-2%**
Ne risquez jamais plus de 1 à 2% de votre capital total sur un seul trade.

Exemple : Capital de 10 000€
• Risque max par trade (2%) = 200€
• Si votre stop loss est à 5% de votre entrée, position max = 200 / 0.05 = 4 000€

**Le ratio Risque/Récompense (R/R)**
Avant chaque trade, calculez votre R/R potentiel.
• R/R de 1:2 = vous risquez 100€ pour potentiellement gagner 200€
• Ne tradez que les opportunités avec un R/R minimum de 1:1.5

**La diversification**
Ne mettez jamais tout votre capital sur un seul actif. Diversifier réduit l'impact d'un mauvais trade.`,
        quiz: [
          {
            question: "Vous avez 5 000€ de capital. Quel est le risque maximum sur un trade (règle des 2%) ?",
            options: ["500€", "100€", "200€", "1 000€"],
            correct: 1,
            explanation: "2% de 5 000€ = 100€. Ne jamais risquer plus de 100€ sur un seul trade avec ce capital.",
          },
          {
            question: "Vous perdez 50% de votre capital. De combien faut-il gagner pour récupérer ?",
            options: ["50%", "75%", "100%", "150%"],
            correct: 2,
            explanation: "Si vous avez 1 000€ et perdez 50% (= 500€ restants), il vous faut gagner 100% sur ces 500€ pour revenir à 1 000€.",
          },
        ],
      },
      {
        id: "position-sizing",
        title: "Dimensionner ses positions",
        duration: "5 min",
        keyPoints: [
          "La taille de position doit être calculée, pas intuitive",
          "Formule : Taille = (Capital × % risque) / Distance stop loss",
          "Le levier amplifie gains ET pertes",
          "Commencer avec levier ×1 en paper trading",
        ],
        content: `Savoir quelle taille de position prendre est une compétence critique. Beaucoup de traders perdent non pas parce qu'ils ont tort sur la direction, mais parce que leur position est trop grosse.

**La formule de dimensionnement**
Taille de position = (Capital × Risque%) ÷ (Prix d'entrée × Distance stop%)

Exemple concret :
• Capital : 10 000€
• Risque par trade : 1% = 100€
• Entrée sur BTC : 50 000€
• Stop loss : 48 500€ (soit 3% sous l'entrée)
• Taille = 100 / (50 000 × 0.03) = 100 / 1 500 = 0.067 BTC

**Le levier : ami ou ennemi ?**
Le levier vous permet de contrôler une position plus grande que votre capital réel.
• Levier ×10 : Chaque mouvement de 1% devient 10%
• Gain potential ×10 → Perte potentielle ×10

Sans stop loss et avec levier, vous pouvez perdre tout votre capital sur un seul trade. Le levier est un outil réservé aux traders expérimentés.

**Conseil pour les débutants**
Commencez toujours avec levier ×1. Maîtrisez la gestion du risque sans levier avant de l'augmenter.`,
        quiz: [
          {
            question: "Votre capital est de 2 000€, risque de 1%, entrée à 100€, stop loss à 95€ (5%). Quelle taille de position ?",
            options: ["400€ (4 actions)", "200€ (2 actions)", "100€ (1 action)", "1 000€ (10 actions)"],
            correct: 0,
            explanation: "Risque max = 2 000 × 1% = 20€. Taille = 20€ ÷ (100 × 5%) = 20 ÷ 5 = 4 actions × 100€ = 400€ de position.",
          },
        ],
      },
    ],
  },

  // ── MODULE 4 ──────────────────────────────────────────────────────────
  {
    id: "market-psychology",
    title: "Psychologie du trading",
    description: "Comprendre et maîtriser vos émotions est aussi important que la technique. La psychologie fait ou défait les traders.",
    icon: "🧠",
    color: "from-yellow-500/20 to-amber-500/20 border-yellow-500/30",
    level: "intermediate",
    lessons: [
      {
        id: "emotions-trading",
        title: "Les émotions en trading",
        duration: "5 min",
        keyPoints: [
          "La peur et la cupidité sont les deux ennemis du trader",
          "FOMO = Fear Of Missing Out (entrer trop tard)",
          "Le revenge trading mène à des pertes catastrophiques",
          "Un plan de trading écrit neutralise les décisions émotionnelles",
        ],
        content: `80% des traders particuliers perdent de l'argent. La raison principale n'est pas technique — c'est psychologique.

**La peur**
La peur de perdre pousse à :
• Couper ses gagnants trop tôt (peur de voir les gains disparaître)
• Tenir ses perdants trop longtemps (peur de matérialiser la perte)
• Ne pas entrer sur de bonnes opportunités

**La cupidité**
L'excès de confiance ou l'appât du gain pousse à :
• Surexposer son capital sur un trade
• Déplacer son stop loss vers le bas pour "laisser le trade respirer"
• Rester en position trop longtemps au lieu de prendre ses profits

**Le FOMO (Fear Of Missing Out)**
Voir un actif monter fortement et entrer précipitamment, souvent au pire moment. Le trade FOMO est rarement rentable car vous êtes le dernier à entrer.

**Le revenge trading**
Après une perte, vouloir "se venger" du marché en prenant un trade immédiat et plus large. C'est la recette pour perdre encore plus.

**La solution : le plan de trading**
Définissez AVANT le trade :
1. Point d'entrée
2. Stop loss
3. Take profit
4. Taille de position

Et respectez-le. Un trade qui respecte votre plan est un bon trade, même s'il perd.`,
        quiz: [
          {
            question: "Vous venez de perdre 300€ sur un trade. Que faites-vous ?",
            options: [
              "Prenez un trade plus gros immédiatement pour récupérer",
              "Faites une pause, analysez ce qui s'est passé, respectez votre plan",
              "Doublez votre taille de position sur le prochain trade",
              "Arrêtez de trader pour toujours",
            ],
            correct: 1,
            explanation: "Après une perte, prenez du recul. Le 'revenge trading' est l'une des erreurs les plus coûteuses. Analysez objectivement le trade perdu et revenez avec un plan clair.",
          },
        ],
      },
      {
        id: "trading-plan",
        title: "Créer son plan de trading",
        duration: "6 min",
        keyPoints: [
          "Un plan de trading définit des règles claires avant chaque trade",
          "Inclure : setup, entrée, stop, objectif, taille",
          "Tenir un journal de trading améliore progressivement les performances",
          "Backtester sa stratégie avant de risquer de l'argent",
        ],
        content: `Un plan de trading est votre règlement intérieur. Il transforme le trading de gambling en activité structurée.

**Les éléments d'un bon plan de trading**

1. **Votre setup** : Quelle configuration vous permet d'entrer ?
   Ex: "Je trade les cassures de résistance avec volume élevé"

2. **Critères d'entrée** : Conditions précises pour entrer
   Ex: "Le prix clôture au-dessus de la résistance + RSI > 50"

3. **Stop loss** : Où est votre invalidation ?
   Ex: "Stop sous le dernier bas significatif"

4. **Objectif (take profit)** : Où sortir ?
   Ex: "Prochaine résistance majeure, R/R minimum 1:2"

5. **Taille de position** : Calculée selon la règle des 2%

6. **Conditions d'invalidation** : Quand NE PAS trader ?
   Ex: "Pas de trade pendant les annonces économiques majeures"

**Le journal de trading**
Notez chaque trade : entrée, sortie, raison, résultat, et ce que vous auriez pu faire mieux. Après 50-100 trades, vous verrez clairement vos patterns gagnants et perdants.

**Le backtesting**
Testez votre stratégie sur des données historiques avant de risquer de l'argent réel. CaptenTDB vous permet de simuler avec du paper trading.`,
      },
    ],
  },

  // ── MODULE 5 ──────────────────────────────────────────────────────────
  {
    id: "asset-classes",
    title: "Comprendre les actifs",
    description: "Actions, crypto, forex, matières premières... Chaque actif a ses caractéristiques, risques et opportunités.",
    icon: "🌍",
    color: "from-green-500/20 to-emerald-500/20 border-green-500/30",
    level: "beginner",
    lessons: [
      {
        id: "stocks",
        title: "Les actions (stocks)",
        duration: "5 min",
        keyPoints: [
          "Une action = une part de propriété d'une entreprise",
          "Le prix reflète les perspectives de croissance et profits",
          "Dividendes = partage des bénéfices avec les actionnaires",
          "Les indices groupent des actions (CAC40, S&P500, NASDAQ)",
        ],
        content: `Les actions sont les actifs les plus connus. Acheter une action, c'est devenir copropriétaire d'une entreprise.

**Comment le prix d'une action est-il fixé ?**
Le prix reflète l'anticipation des profits futurs de l'entreprise. Plus les investisseurs s'attendent à une forte croissance, plus ils sont prêts à payer cher.

**Les facteurs qui influencent le prix**
• Résultats financiers trimestriels (revenus, bénéfices)
• Actualités de l'entreprise (nouveaux produits, acquisitions)
• Secteur économique et contexte macro
• Sentiment général du marché

**Les dividendes**
Certaines entreprises distribuent une partie de leurs bénéfices aux actionnaires. C'est un revenu passif mais qui réduit mécaniquement le prix de l'action le jour du versement.

**Les indices boursiers**
• CAC 40 : 40 plus grandes entreprises françaises
• S&P 500 : 500 plus grandes entreprises américaines
• NASDAQ 100 : 100 plus grandes entreprises tech américaines
• DAX 40 : Allemagne

Un indice monte quand ses composantes montent en moyenne.

**Les horaires de trading**
• Paris (Euronext) : 9h00 - 17h30
• New York (NYSE/NASDAQ) : 15h30 - 22h00 (heure française)`,
        quiz: [
          {
            question: "Qu'est-ce que le CAC 40 ?",
            options: [
              "Un indicateur technique inventé en 1940",
              "Les 40 plus grandes entreprises françaises cotées en bourse",
              "Le cours de l'or à Paris",
              "Un taux d'intérêt fixé par la BCE",
            ],
            correct: 1,
            explanation: "Le CAC 40 (Cotation Assistée en Continu) est l'indice de référence de la bourse de Paris, regroupant les 40 entreprises françaises les plus grandes par capitalisation boursière.",
          },
        ],
      },
      {
        id: "crypto",
        title: "Les crypto-monnaies",
        duration: "5 min",
        keyPoints: [
          "Bitcoin = première crypto, réserve de valeur numérique",
          "Ethereum = plateforme de contrats intelligents",
          "Marché 24h/24, 7j/7, très volatil",
          "Capitalisation boursière = prix × nombre de tokens en circulation",
        ],
        content: `Les crypto-monnaies sont des actifs numériques décentralisés basés sur la technologie blockchain.

**Bitcoin (BTC)**
Créé en 2009 par Satoshi Nakamoto. Première crypto et toujours la plus grande par capitalisation. Surnommé "l'or numérique", il est souvent utilisé comme réserve de valeur. Supply limitée à 21 millions de BTC.

**Ethereum (ETH)**
La deuxième plus grande crypto. Sa force : la plateforme de "smart contracts" (contrats intelligents) qui permettent de créer des applications décentralisées (DeFi, NFT...).

**Les altcoins**
Toutes les crypto autres que Bitcoin. Certains sont des projets sérieux, d'autres sont des spéculations pures (memecoins).

**Caractéristiques uniques des crypto**
• Marchés ouverts 24h/24, 7j/7 (y compris Noël !)
• Très haute volatilité (hausse ou baisse de 20% en une journée est possible)
• Pas de régulateur central
• Custody : si vous perdez votre clé privée, vous perdez vos cryptos

**La dominance Bitcoin**
Quand la dominance BTC monte, les altcoins baissent généralement (les investisseurs se refugient vers BTC). Quand elle baisse, les altcoins ont tendance à surperformer (altseason).`,
        quiz: [
          {
            question: "Quel est le nombre maximum de Bitcoins qui pourront jamais exister ?",
            options: ["1 million", "10 millions", "21 millions", "Illimité"],
            correct: 2,
            explanation: "Le protocole Bitcoin limite l'offre totale à 21 millions de BTC. Cette rareté programmée est l'un des arguments pour sa valeur comme réserve de valeur.",
          },
        ],
      },
      {
        id: "forex",
        title: "Le marché des devises (Forex)",
        duration: "4 min",
        keyPoints: [
          "Forex = marché des devises, le plus grand du monde",
          "Les paires : EUR/USD = euros en dollars",
          "Pip = plus petite unité de variation",
          "Très liquide mais nécessite du levier pour être rentable",
        ],
        content: `Le Forex (Foreign Exchange) est le marché des devises. C'est le marché financier le plus grand et le plus liquide au monde, avec plus de 7 000 milliards de dollars échangés chaque jour.

**Comment fonctionnent les paires de devises ?**
On achète toujours une devise et on en vend une autre.

EUR/USD = 1.1000 signifie que 1 euro vaut 1.10 dollar.

**Les paires majeures**
• EUR/USD : Euro / Dollar américain
• GBP/USD : Livre sterling / Dollar (le "Cable")
• USD/JPY : Dollar / Yen japonais
• USD/CHF : Dollar / Franc suisse

**Le Pip**
La plus petite unité de variation de prix. Pour EUR/USD, un pip = 0.0001.

**Pourquoi le forex est-il si complexe ?**
Les variations journalières sont souvent très petites (quelques centimes). Pour être rentable, il faut utiliser du levier — ce qui amplifie les risques. Le forex est recommandé pour les traders avec de l'expérience.

**Les horaires du forex**
Contrairement aux bourses, le forex est ouvert 24h/24 du dimanche soir (ouverture Sydney) au vendredi soir (fermeture New York). Il n'y a pas de pause sauf le week-end.`,
        quiz: [
          {
            question: "EUR/USD = 1.0850. Que signifie ce chiffre ?",
            options: [
              "1 dollar américain vaut 1.0850 euros",
              "1 euro vaut 1.0850 dollars américains",
              "Le forex est à 1.0850% de hausse",
              "Il faut 1.0850 pips pour acheter un euro",
            ],
            correct: 1,
            explanation: "EUR/USD = 1.0850 signifie que 1 euro vaut 1.0850 dollars américains. La première devise de la paire est toujours la devise de base.",
          },
        ],
      },
    ],
  },

  // ── MODULE 6 ──────────────────────────────────────────────────────────
  {
    id: "advanced-strategies",
    title: "Stratégies avancées",
    description: "Swing trading, cassures, divergences RSI... Des stratégies testées et éprouvées pour progresser.",
    icon: "⚡",
    color: "from-indigo-500/20 to-blue-500/20 border-indigo-500/30",
    level: "intermediate",
    lessons: [
      {
        id: "swing-trading-strategy",
        title: "La stratégie de swing trading",
        duration: "8 min",
        keyPoints: [
          "Entrer sur les retracements dans une tendance établie",
          "Utiliser les EMA 20 et 50 comme zones de support dynamique",
          "Confirmer avec le RSI et le volume",
          "Stop sous le dernier bas/haut significatif",
        ],
        content: `Le swing trading consiste à capturer des mouvements intermédiaires (2 à 10 jours) dans une tendance établie.

**Setup de base : le pullback sur EMA**

1. Identifier une tendance haussière (prix > EMA 50, EMA 20 > EMA 50)
2. Attendre un retracement vers l'EMA 20 ou EMA 50
3. Chercher un signal de reprise haussière (bougie de retournement)
4. Confirmer avec RSI > 50 et volume en hausse
5. Entrer au-dessus du plus haut de la bougie de signal
6. Stop sous le plus bas du retracement
7. Objectif : prochain niveau de résistance ou R/R de 1:2 minimum

**La gestion partielle**
Un truc de pro : sortir 50% de la position au premier objectif (R/R 1:1) et laisser courir le reste avec un trailing stop. Vous sécurisez des profits tout en laissant la chance au trade de donner plus.

**Les meilleures conditions**
• Tendance clairement établie sur le daily
• Retracement peu profond (moins de 50% du mouvement précédent)
• Faible volume sur le retracement (les vendeurs sont peu présents)
• Forte reprise du volume à la reprise haussière`,
      },
      {
        id: "rsi-divergence",
        title: "Les divergences RSI",
        duration: "6 min",
        keyPoints: [
          "Divergence haussière : prix fait un plus bas, RSI fait un plus haut",
          "Divergence baissière : prix fait un plus haut, RSI fait un plus bas",
          "Signal de retournement puissant mais à confirmer",
          "Plus fiable sur les timeframes élevés (4H, Daily)",
        ],
        content: `Les divergences entre le prix et le RSI sont parmi les signaux les plus puissants de l'analyse technique.

**Divergence haussière (bullish divergence)**
Le prix fait un nouveau plus bas, mais le RSI fait un plus bas moins bas que le précédent. Interprétation : la pression vendeuse s'affaiblit malgré la baisse des prix. Signal de retournement potentiel à la hausse.

**Divergence baissière (bearish divergence)**
Le prix fait un nouveau plus haut, mais le RSI fait un plus haut moins haut que le précédent. Interprétation : la pression acheteuse s'affaiblit malgré la hausse des prix. Signal de retournement potentiel à la baisse.

**Comment trader les divergences ?**
1. Identifier la divergence sur un timeframe élevé (4H ou Daily)
2. Descendre sur un timeframe plus bas (1H) pour l'entrée précise
3. Attendre un signal de retournement (bougie d'englobement, pin bar)
4. Confirmer avec d'autres éléments (support/résistance, volume)
5. Stop au-delà du dernier extrême de prix

**Attention !**
Les divergences peuvent durer longtemps. Ne vous positionnez pas à contre-tendance uniquement sur une divergence. Attendez la confirmation du retournement.`,
        quiz: [
          {
            question: "Le prix fait un nouveau plus bas à 1 000€, mais le RSI est à 35 contre 25 lors du précédent plus bas. C'est :",
            options: [
              "Une divergence baissière, signal de continuation baissière",
              "Une divergence haussière, signal de retournement potentiel à la hausse",
              "Un signal neutre sans signification",
              "Un surachat du RSI",
            ],
            correct: 1,
            explanation: "C'est une divergence haussière : le prix fait un nouveau plus bas mais le RSI est plus haut (35 > 25). La pression vendeuse s'affaiblit, ce qui peut précéder un retournement haussier.",
          },
        ],
      },
    ],
  },
];

export function getModulesForLevel(level: string | null | undefined): Module[] {
  if (!level || level === "expert") return LEARN_MODULES;
  if (level === "intermediate") return LEARN_MODULES.filter((m) => m.level !== "advanced");
  // beginner: all modules but focus on beginner first
  return LEARN_MODULES;
}

export function getLevelBadge(level: string): { label: string; color: string } {
  switch (level) {
    case "beginner": return { label: "Débutant", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" };
    case "intermediate": return { label: "Intermédiaire", color: "text-blue-400 bg-blue-500/15 border-blue-500/30" };
    case "advanced": return { label: "Avancé", color: "text-purple-400 bg-purple-500/15 border-purple-500/30" };
    default: return { label: "Tous niveaux", color: "text-white/60 bg-white/10 border-white/20" };
  }
}
