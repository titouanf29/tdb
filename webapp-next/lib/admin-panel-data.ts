export type KPI = {
  id: string;
  label: string;
  unit: 'percent' | 'count' | 'currency' | 'days';
  m3: number;
  m6: number;
  m12: number;
  owner: string;
};

export type Experiment = {
  id: string;
  hypothesis: string;
  metric: string;
  targetLift: string;
  effort: 'S' | 'M' | 'L';
  window: string;
};

export type ChannelPlan = {
  channel: string;
  objective: string;
  cadence: string;
  hooks: string[];
  cta: string;
};

export type QuarterPlan = {
  quarter: string;
  objective: string;
  keyMoves: string[];
  budgetEUR: number;
  expectedImpact: string;
};

export type Persona = {
  id: string;
  name: string;
  age: string;
  description: string;
  trigger: string;
  channels: string[];
  tone: string;
};

export type Tagline = {
  text: string;
  usage: string;
  isPrimary: boolean;
};

export type ContentPrompt = {
  id: string;
  category: 'remotion' | 'tiktok' | 'blog' | 'twitter' | 'newsletter' | 'general';
  title: string;
  description: string;
  prompt: string;
};

export type RedFlag = {
  action: string;
  reason: string;
};

export type PhaseChecklist = {
  phase: string;
  period: string;
  tasks: string[];
};

export type AdminPanelData = {
  generatedAt: string;
  northStar: string;
  uvp: string;
  strategy: {
    positioning: string;
    segments: string[];
    valueProps: string[];
  };
  taglines: Tagline[];
  personas: Persona[];
  kpis: KPI[];
  channels: ChannelPlan[];
  roadmap: QuarterPlan[];
  experiments: Experiment[];
  contentEngine: {
    weeklySlots: string[];
    seoClusters: string[];
    leadMagnets: string[];
  };
  prompts: ContentPrompt[];
  phaseChecklists: PhaseChecklist[];
  redFlags: RedFlag[];
  riskRegister: Array<{ risk: string; mitigation: string; owner: string }>;
};

export function getAdminPanelData(): AdminPanelData {
  return {
    generatedAt: new Date().toISOString(),
    northStar: '10 000 utilisateurs actifs / mois avec CAC soutenable et rétention M3 > 25%',
    uvp: 'CaptenTDB est la seule plateforme qui t\'apprend à analyser les marchés avec une IA, gratuitement, sans jargon et sans te promettre de t\'enrichir.',

    strategy: {
      positioning:
        'CaptenTDB = plateforme d\'éducation trading assistée IA, orientée pratique, sans promesse de gain.',
      segments: [
        'Débutants 18-30 (social-first — TikTok, YouTube Shorts)',
        'Actifs 30-45 (SEO + newsletter — Google, LinkedIn)',
        'Autodidactes traders (communauté + outils — X/Twitter, Discord)',
        'Curieux 45-60 (blog + newsletter — Google, Email)',
      ],
      valueProps: [
        'Apprentissage concret via scanner + wallet virtuel 10 000$',
        'IA pédagogique en français — Score 0-100 par actif',
        'Parcours sans jargon, sans paywall agressif',
        '842+ actifs · 9 marchés · Assistant IA 24h/24',
      ],
    },

    taglines: [
      {
        text: 'La bourse, enfin claire.',
        usage: 'Tagline principale — site, bio, partout',
        isPrimary: true,
      },
      {
        text: 'L\'IA analyse. Toi, tu comprends.',
        usage: 'Vidéos Remotion, publicités Meta/TikTok',
        isPrimary: false,
      },
      {
        text: 'Apprends à trader — avant d\'investir un centime.',
        usage: 'TikTok/Reels, angle peur de perdre',
        isPrimary: false,
      },
      {
        text: 'Ton premier outil de trading. Gratuit. Sérieux.',
        usage: 'Google Ads, comparaisons concurrents',
        isPrimary: false,
      },
    ],

    personas: [
      {
        id: 'lucas',
        name: 'Lucas — L\'étudiant curieux',
        age: '20–25 ans',
        description: 'Entend parler de bourse via TikTok / Reddit / ses amis. A peur de "tout perdre", ne sait pas par où commencer. Cherche une explication claire sans payer.',
        trigger: '"Je veux comprendre comment ça marche avant de risquer mes économies."',
        channels: ['TikTok', 'YouTube Shorts', 'Reddit r/finances', 'Discord'],
        tone: 'Simple, sans jargon, hooks basés sur la peur de rater. Format court et dynamique.',
      },
      {
        id: 'camille',
        name: 'Camille — La salariée en reconversion',
        age: '28–38 ans',
        description: 'Veut faire fructifier ses économies, lit des articles mais reste perdue. Pas le temps pour des formations longues. Cherche un outil pratique, pas une école à 2 000€.',
        trigger: '"Je veux investir intelligemment mais sans me faire arnaquer."',
        channels: ['LinkedIn', 'Newsletter', 'Blog SEO (Google)', 'Instagram'],
        tone: 'Rassurant, aucune promesse de gains, format structuré, preuve de crédibilité.',
      },
      {
        id: 'mehdi',
        name: 'Mehdi — Le trader débutant actif',
        age: '25–35 ans',
        description: 'A déjà un compte courtier, fait des erreurs. Veut des signaux, des indicateurs, de la méthode. Consomme du contenu technique sur X/Twitter et Discord.',
        trigger: '"Je cherche des signaux fiables et des outils d\'analyse gratuits."',
        channels: ['X/Twitter', 'Discord finance', 'Telegram', 'Reddit r/bourse'],
        tone: 'Technique assumé (RSI, MACD, Bollinger). Screenshots outil en action. Social proof chiffrée.',
      },
      {
        id: 'jeanpierre',
        name: 'Jean-Pierre — Le curieux de 50 ans',
        age: '45–60 ans',
        description: 'Retraite approche, veut diversifier au-delà du livret A. Méfiant des arnaques, cherche une source crédible. Préfère des articles longs et structurés.',
        trigger: '"Je veux comprendre les actions et la crypto sans me faire avoir."',
        channels: ['Google (SEO)', 'Newsletter', 'Blog', 'YouTube'],
        tone: 'Sécurité et crédibilité avant tout. Disclaimer légal visible. Pas de jargon crypto.',
      },
    ],

    kpis: [
      { id: 'traffic', label: 'Sessions organiques mensuelles', unit: 'count', m3: 1000, m6: 5000, m12: 20000, owner: 'SEO Lead' },
      { id: 'signup', label: 'Utilisateurs inscrits', unit: 'count', m3: 500, m6: 2500, m12: 10000, owner: 'Growth PM' },
      { id: 'activation', label: 'Taux conversion landing', unit: 'percent', m3: 8, m6: 12, m12: 15, owner: 'Product' },
      { id: 'retention', label: 'Rétention J7', unit: 'percent', m3: 20, m6: 30, m12: 40, owner: 'Lifecycle' },
      { id: 'newsletter', label: 'Abonnés newsletter', unit: 'count', m3: 200, m6: 1000, m12: 5000, owner: 'CRM' },
      { id: 'tiktok', label: 'Abonnés TikTok', unit: 'count', m3: 500, m6: 5000, m12: 20000, owner: 'Social' },
      { id: 'dau', label: 'DAU (Utilisateurs actifs/jour)', unit: 'count', m3: 50, m6: 400, m12: 2000, owner: 'Product' },
    ],

    channels: [
      {
        channel: 'TikTok / Reels / Shorts',
        objective: 'Acquisition rapide 18-35 ans — 1 vidéo/jour, viser 10K abonnés à M3',
        cadence: '5 vidéos / semaine',
        hooks: [
          '"Tu penses que le trading c\'est trop compliqué ? Regarde ça."',
          '"1 indicateur. 30 secondes. Tu vas comprendre pourquoi tes trades ratent."',
          '"Ce que ton courtier ne t\'explique JAMAIS."',
          '"J\'ai analysé 500 actifs avec l\'IA. Voilà ce que j\'ai trouvé."',
        ],
        cta: 'Lien bio → captentdb.fr · Bio : "📊 Apprends le trading — gratuitement | 🔗 captentdb.fr"',
      },
      {
        channel: 'Blog SEO',
        objective: 'Trafic organique durable — 5 000 visites/mois à M6, 20 000 à M12',
        cadence: '2 articles/semaine M1-M3, puis 1/semaine',
        hooks: [
          'Guides "comment lire un graphique boursier"',
          'Glossaires actionnables (RSI, MACD, Bollinger...)',
          'Comparatifs "CaptenTDB vs TradingView"',
          'Articles "Pourquoi 80% des traders perdent..."',
        ],
        cta: 'CTA intermédiaire : "Teste le scanner IA gratuitement → captentdb.fr"',
      },
      {
        channel: 'Newsletter',
        objective: 'Rétention + nurturing — taux ouverture cible > 35%',
        cadence: '1 email / vendredi matin',
        hooks: [
          'Structure : Marchés semaine + Actif spotlight + Leçon + Contenus publiés',
          'Séquence bienvenue : 7 emails sur 14 jours',
          'CTA récurrent : "Invite un ami, débloquez une fonctionnalité"',
        ],
        cta: 'Démarrer un portefeuille virtuel 10 000$.',
      },
      {
        channel: 'X / Twitter',
        objective: 'Crédibilité finance/tech — 500 abonnés à M1, 5K à M6',
        cadence: '1 thread/lundi + 1 tweet quotidien',
        hooks: [
          'Thread hebdo : "7 choses à surveiller sur les marchés cette semaine"',
          'Tweets courts : 1 stat marché + commentaire pédagogique',
          'Réponses proactives sur fils finance FR (BFM, Le Revenu)',
        ],
        cta: 'Lien vers captentdb.fr en bio + dans les threads pertinents.',
      },
      {
        channel: 'YouTube',
        objective: 'Autorité long terme + SEO YouTube — 1K abonnés à M6',
        cadence: '1 vidéo / semaine',
        hooks: [
          'Tutorial outil : "Comment utiliser le scanner IA de CaptenTDB"',
          'Éducation : "RSI : le guide COMPLET pour débutants (2026)"',
          'Analyse marché hebdomadaire',
          'Case study : "J\'ai utilisé le wallet virtuel 30 jours"',
        ],
        cta: 'CTA en fin de vidéo + description : "Inscris-toi gratuitement → captentdb.fr"',
      },
      {
        channel: 'Community (Discord/Telegram)',
        objective: 'Rétention et preuve sociale',
        cadence: 'Résumé marché quotidien + sondage hebdo + partage analyses',
        hooks: [
          'Telegram : résumé marché automatisé chaque matin',
          'Discord (si > 500 membres) : 3 salons Marchés + 3 Apprentissage + 3 Communauté',
        ],
        cta: 'Activer notifications scanner et rejoindre le challenge hebdo.',
      },
    ],

    roadmap: [
      {
        quarter: 'Q2 2026',
        objective: 'Poser le moteur acquisition organique',
        keyMoves: [
          'Lancer compte TikTok + X/Twitter',
          'Publier 10 premiers articles de blog',
          'Créer Guide PDF débutant (Lead Magnet #1)',
          'Mettre en place séquence email bienvenue (7 emails)',
          'Ajouter social proof sur la landing page',
          'Exporter et publier les vidéos Remotion',
        ],
        budgetEUR: 0,
        expectedImpact: 'Base 500 inscrits + 500 abonnés TikTok',
      },
      {
        quarter: 'Q3 2026',
        objective: 'Traction et lead magnets',
        keyMoves: [
          'Lancer mini-cours email 7 jours (Lead Magnet #2)',
          'Atteindre 5K abonnés TikTok',
          '20 articles de blog publiés',
          'Premier partenariat créateur YouTube (< 50K abonnés)',
          'Lancer Meta Ads (150€/mois)',
        ],
        budgetEUR: 450,
        expectedImpact: '2 500 inscrits + 1 000 abonnés newsletter',
      },
      {
        quarter: 'Q4 2026',
        objective: 'Scale et communauté',
        keyMoves: [
          'Product Hunt launch',
          'Campagne Google Ads Search (200€/mois)',
          'Lancement Discord (si > 500 membres)',
          'Programme de referral dans le produit',
          'Premier live YouTube analyse marché',
        ],
        budgetEUR: 1500,
        expectedImpact: '5 000 inscrits + première couverture presse',
      },
      {
        quarter: 'Q1 2027',
        objective: 'Objectif 10 000 utilisateurs',
        keyMoves: [
          'Programme ambassadeurs créateurs finance FR',
          'Optimisation LTV par cohortes',
          'Syndication contenu média partenaires',
          'TechCrunch FR / BFM Business',
        ],
        budgetEUR: 3000,
        expectedImpact: '10 000 utilisateurs actifs — objectif atteint',
      },
    ],

    experiments: [
      {
        id: 'exp-hero-01',
        hypothesis: 'Un hero "L\'IA analyse. Toi, tu comprends." augmente le signup vs "La bourse, enfin claire."',
        metric: 'Signup rate landing',
        targetLift: '+15%',
        effort: 'S',
        window: '2 semaines',
      },
      {
        id: 'exp-onboard-02',
        hypothesis: 'Un onboarding en 3 questions (marché préféré + niveau + objectif) améliore l\'activation J+1.',
        metric: 'J+1 activation',
        targetLift: '+20%',
        effort: 'M',
        window: '3 semaines',
      },
      {
        id: 'exp-email-03',
        hypothesis: 'La séquence email "7 jours / 7 leçons" améliore la rétention D30 vs email de bienvenue seul.',
        metric: 'Retention D30',
        targetLift: '+12%',
        effort: 'M',
        window: '4 semaines',
      },
      {
        id: 'exp-tiktok-04',
        hypothesis: 'Le hook "Ce que ton courtier ne t\'explique jamais" performe mieux que le hook statistique.',
        metric: 'Watch rate 3s + taux conversion bio',
        targetLift: '+25%',
        effort: 'S',
        window: '1 semaine',
      },
    ],

    contentEngine: {
      weeklySlots: [
        'Lundi : Thread X/Twitter "7 choses à surveiller" + brief Telegram',
        'Mardi : Tutoriel scanner ou démo outil (TikTok + YouTube)',
        'Mercredi : Short vidéo "erreur fréquente" ou "mythe vs réalité"',
        'Jeudi : Article SEO satellite + repurpose LinkedIn',
        'Vendredi : Newsletter hebdomadaire + recap TikTok "market update"',
      ],
      seoClusters: [
        'Apprendre le trading débutant (RSI, MACD, chandeliers, graphiques)',
        'Crypto pour débutants (Bitcoin, Ethereum, DeFi, risques)',
        'Forex (EUR/USD, levier, pip, devises)',
        'Outils gratuits (CaptenTDB vs TradingView, scanner IA)',
        'Psychologie du trading (biais cognitifs, discipline, pertes)',
        'Marchés en 2026 (CAC 40, S&P 500, actus trimestrielles)',
      ],
      leadMagnets: [
        'LM1 — Guide PDF "Débuter en bourse sans se planter" (priorité 1)',
        'LM2 — Mini-cours email "7 jours pour comprendre la bourse"',
        'LM3 — Template Watchlist Google Sheets',
        'LM4 — Quiz "Quel type d\'investisseur es-tu ?"',
      ],
    },

    prompts: [
      // ─── REMOTION ───────────────────────────────────────────────────────────
      {
        id: 'remotion-testimonial',
        category: 'remotion',
        title: 'Nouvelle scène "Témoignage utilisateur"',
        description: 'Ajoute de la social proof dans la vidéo 16:9 avec 3 témoignages animés.',
        prompt: `Dans le projet Remotion my-video, crée une nouvelle scène "Testimonial" dans src/CaptentDB/scenes/Testimonial.tsx.

La scène dure 8 secondes (480 frames à 60fps).
Elle affiche 3 témoignages utilisateurs qui s'enchaînent (un toutes les ~2.5s).

Contenu des témoignages :
1. "Enfin un outil qui explique sans promettre la lune." — @lucas_trader
2. "Le scanner IA m'a fait gagner un temps fou dans mes analyses." — @camille_invest
3. "Gratuit et aussi puissant que des outils à 50€/mois." — @mehdi_bourse

Design : fond sombre (#05060f), carte glassmorphism avec avatar circulaire (initiales colorées), étoiles ⭐⭐⭐⭐⭐, texte blanc, badge accent violet.
Chaque témoignage entre avec un spring depuis le bas et sort vers le haut.
Utilise les tokens de couleur C importés depuis ../constants.
Ajoute ensuite cette scène dans l'index.tsx de CaptentDB entre Dashboard et AIAnalysis.`,
      },
      {
        id: 'remotion-scanner-tuto',
        category: 'remotion',
        title: 'Vidéo "Tutorial Scanner IA" (TikTok 30s)',
        description: 'Crée une nouvelle composition TikTok 30s montrant comment utiliser le scanner.',
        prompt: `Dans le projet Remotion my-video, crée une nouvelle composition "ScannerTutorial" dans src/ScannerTutorial/.

Format : 9:16, 1080×1920, 60fps, 30 secondes (1800 frames).

Structure :
- 00-03s : Hook texte "Tu sais pas comment trouver les meilleures opportunités ?" (texte blanc géant, spring entrance)
- 03-08s : Simulation ouverture scanner CaptenTDB — 3 actifs : NVDA (93), SOL (88), AAPL (76) avec score ring animé
- 08-20s : Zoom sur NVDA — indicateurs RSI, MACD, Volume avec barres de progression animées
- 20-27s : Résultat IA "ACHETER — Signal fort" en vert avec confetti particles
- 27-30s : CTA "Teste gratuitement sur captentdb.fr"

Utilise les mêmes couleurs que CaptentDBTikTok (importe depuis les constantes existantes).
Ajoute la composition dans Root.tsx.`,
      },
      {
        id: 'remotion-ab-hook',
        category: 'remotion',
        title: 'A/B test hook TikTok existant',
        description: 'Modifie le hook des 3 premières secondes pour tester une variante.',
        prompt: `Dans src/CaptentDBTikTok/scenes/SearchScene.tsx, modifie le texte du hook des 3 premières secondes (la div qui apparaît avant le clavier).

Nouveau texte :
- Ligne 1 (tag) : "1 indicateur. 30 secondes."
- Ligne 2 (headline) : "Tu vas comprendre pourquoi tes trades ratent."

Garde exactement le même style visuel (taille, couleurs, animations).`,
      },
      {
        id: 'remotion-comparison',
        category: 'remotion',
        title: 'Scène "Comparaison vs TradingView"',
        description: 'Tableau comparatif animé CaptenTDB vs TradingView.',
        prompt: `Dans src/CaptentDB/scenes/, crée Comparison.tsx (durée 8s, 480 frames).

Tableau comparatif animé entre CaptenTDB et TradingView.
Colonnes : "Fonctionnalité" | "CaptenTDB" | "TradingView"
Lignes (spring staggeré, 0.4s de délai) :
1. Prix          | Gratuit ✅    | 15€/mois ❌
2. IA intégrée   | Oui ✅        | Non ❌
3. Débutant      | Accessible ✅ | Technique ⚠️
4. Scanner auto  | Oui ✅        | Payant ❌
5. Wallet virtuel| 10 000$ ✅    | Non ❌

Header "CaptenTDB" en violet avec glow, "TradingView" en gris.
Ajoute cette scène dans CaptentDB entre Browser et Dashboard.`,
      },
      {
        id: 'remotion-weekly',
        category: 'remotion',
        title: 'Template "Market Update hebdomadaire"',
        description: 'Composition paramétrée via props Zod — modifiable chaque semaine sans toucher au code.',
        prompt: `Dans my-video, crée "WeeklyUpdate" dans src/WeeklyUpdate/ (9:16, 1080×1920, 60fps, 45s).

Props configurables (schema Zod) :
- weekNumber: number
- dateRange: string
- markets: Array<{ name: string, value: string, change: number }>
- spotlightAsset: { name: string, signal: "ACHETER"|"NEUTRE"|"VENDRE", score: number }
- lessonTitle: string

Structure :
- 00-05s : Titre "Marchés — Semaine #XX" + date + badge LIVE
- 05-20s : Tableau marchés (chiffres animés, rouge/vert)
- 20-35s : Spotlight actif avec score ring et analyse courte
- 35-42s : Leçon de la semaine
- 42-45s : CTA captentdb.fr

Ajoute dans Root.tsx.`,
      },
      {
        id: 'remotion-30s',
        category: 'remotion',
        title: 'Version 30s pour pubs Meta/Instagram',
        description: 'Version condensée de CaptentDB 60s → 30s en réutilisant les composants existants.',
        prompt: `Dans my-video, crée "CaptentDB30s" dans src/CaptentDB30s/.
Version condensée de CaptentDB, 30s (1800 frames, 60fps, 16:9).

Structure :
- 00-04s : Hook (réutilise src/CaptentDB/scenes/Hook.tsx)
- 04-12s : Dashboard (réutilise src/CaptentDB/scenes/Dashboard.tsx)
- 12-22s : AI Analysis condensée — uniquement le résultat (démarre à RESULT_START)
- 22-30s : Outro (réutilise src/CaptentDB/scenes/Outro.tsx)

Réutilise les composants existants via import. Ne duplique pas le code.
Ajoute dans Root.tsx avec durationInFrames={1800}.`,
      },

      // ─── TIKTOK ─────────────────────────────────────────────────────────────
      {
        id: 'tiktok-script-rsi',
        category: 'tiktok',
        title: 'Script TikTok "RSI expliqué en 30s"',
        description: 'Script complet avec visuels suggérés — prêt à filmer.',
        prompt: `Écris un script TikTok de 30 secondes pour CaptenTDB sur "le RSI expliqué".

Contraintes :
- Hook puissant dans les 3 premières secondes
- Ton : direct, pédagogique, pas condescendant
- Pas de jargon inexpliqué, mentionne CaptenTDB naturellement
- CTA final vers captentdb.fr
- Format : [VISUEL] + [TEXTE À DIRE] pour chaque segment
- ~75 mots (30 secondes de parole)
- Persona : Lucas (étudiant, 22 ans)
- Ne jamais promettre des gains`,
      },
      {
        id: 'tiktok-script-avantapres',
        category: 'tiktok',
        title: 'Script TikTok "Avant/Après trader"',
        description: 'Format storytelling — erreur classique puis méthode correcte avec CaptenTDB.',
        prompt: `Écris un script TikTok 45s format "Avant/Après" pour CaptenTDB.

Avant : débutant achète sur news, sans analyser, perd.
Après : même débutant utilise le scanner IA CaptenTDB, vérifie score (87/100), RSI, volume, comprend POURQUOI il décide.

Message clé : "La différence, c'est la méthode. Pas la chance."
Format : [VISUEL] + [TEXTE À DIRE]
CTA : "Wallet virtuel gratuit sur captentdb.fr — entraîne-toi sans risquer un centime"`,
      },
      {
        id: 'tiktok-idees-mois',
        category: 'tiktok',
        title: '7 idées de vidéos TikTok pour le mois',
        description: 'Génère un mois complet d\'idées TikTok variées et ciblées.',
        prompt: `Génère 7 idées de vidéos TikTok pour CaptenTDB pour le mois prochain.

Contraintes :
- Varier les formats (explication, démo, mythe vs réalité, market update)
- Cibler un persona différent parmi : Lucas, Camille, Mehdi
- Ne jamais promettre de gains ou performances
- Ancrer sur les fonctionnalités réelles : scanner IA, score 0-100, wallet virtuel 10 000$, assistant IA, 842+ actifs

Pour chaque idée : Titre | Hook (3 premières secondes) | Format | Durée | Persona cible`,
      },

      // ─── BLOG ───────────────────────────────────────────────────────────────
      {
        id: 'blog-article-complet',
        category: 'blog',
        title: 'Rédiger un article SEO complet',
        description: 'Article 2000-2500 mots avec FAQ, CTAs et structure optimisée Google.',
        prompt: `Rédige un article de blog SEO pour captentdb.fr sur :
"[SUJET DE L'ARTICLE]"

Contraintes SEO :
- 2000–2500 mots
- H1 avec mot-clé principal, 4-5 H2 avec mots-clés secondaires
- FAQ en bas (5 questions) pour rich snippets Google
- CTA naturel à mi-article : "Teste le scanner IA gratuitement → captentdb.fr"
- CTA final : invitation à s'inscrire

Ton : pédagogique, accessible, bienveillant. Pas de jargon inexpliqué.
Cible : [PERSONA — Lucas / Camille / Mehdi / Jean-Pierre]
Structure : Introduction → Sections → Comment CaptenTDB aide → Conclusion + CTA → FAQ
Disclaimer en fin : "Cet article est à but éducatif uniquement et ne constitue pas un conseil en investissement."`,
      },
      {
        id: 'blog-10-titres',
        category: 'blog',
        title: '10 titres d\'articles SEO',
        description: 'Génère 10 titres optimisés pour différents clusters thématiques.',
        prompt: `Génère 10 titres d'articles de blog optimisés SEO pour captentdb.fr.

Thèmes : trading débutant, indicateurs techniques (RSI, MACD), crypto débutants, investir sans risque, psychologie du trading.
Contraintes :
- Mot-clé recherché dans chaque titre
- Format clair : question ou liste ("X façons de...", "Comment...", "Pourquoi...")
- Cibler débutants (Lucas et Camille)
- Inclure l'année 2026 dans certains titres
- Ne jamais promettre de gains`,
      },

      // ─── TWITTER ────────────────────────────────────────────────────────────
      {
        id: 'twitter-thread',
        category: 'twitter',
        title: 'Thread hebdomadaire',
        description: 'Thread 8 tweets éducatif avec CTA final.',
        prompt: `Écris un thread Twitter/X éducatif pour CaptenTDB sur :
"[SUJET DU THREAD]"

Format :
- Tweet 1 (accroche) : hook fort
- Tweets 2 à 7 : une raison/point par tweet avec lien naturel vers CaptenTDB
- Tweet 8 : synthèse + CTA captentdb.fr

Contraintes : max 280 caractères par tweet, ton direct, pas arrogant, pas de promesse de gains, 1-2 émojis max par tweet, hashtags : #trading #bourse #finance`,
      },
      {
        id: 'twitter-5tweets',
        category: 'twitter',
        title: '5 tweets quotidiens',
        description: 'Une semaine de tweets prêts à publier.',
        prompt: `Génère 5 tweets pour CaptenTDB (lundi à vendredi).

Chaque tweet :
- Info ou stat marché éducative
- Mention CaptenTDB naturelle dans 2 tweets max
- Autonome (compréhensible sans contexte)
- Ton professionnel mais accessible
- Max 280 caractères, pas de promesse de gains

Formats suggérés : stat + explication, erreur classique + solution, "Savais-tu que..."`,
      },

      // ─── NEWSLETTER ─────────────────────────────────────────────────────────
      {
        id: 'newsletter-bienvenue',
        category: 'newsletter',
        title: 'Email de bienvenue (E1)',
        description: 'Premier email de la séquence d\'onboarding — chaleureux et actionnable.',
        prompt: `Rédige l'email de bienvenue (E1) pour CaptenTDB.
L'utilisateur vient de s'inscrire sur captentdb.fr.

L'email doit :
- Objet accrocheur < 50 caractères
- Ton chaleureux, pas corporate
- Rappel des 3 principales choses à faire sur CaptenTDB
- 1 action concrète immédiate (analyser son premier actif)
- CTA bouton : "Démarrer mon analyse →"
- PS : lien vers le guide PDF débutant
- 200–300 mots maximum
- Pas de promesse de gains
- Disclaimer légal en footer (1 ligne)`,
      },
      {
        id: 'newsletter-hebdo',
        category: 'newsletter',
        title: 'Newsletter hebdomadaire',
        description: 'Email complet format "CaptenTDB Weekly" avec A/B test objet.',
        prompt: `Rédige la newsletter hebdomadaire CaptenTDB.

Données à remplir :
- Semaine du [DATE]
- Performance marchés (invente des chiffres réalistes) : CAC 40, S&P 500, Bitcoin
- Actif spotlight : [NOM ACTIF]
- Leçon de la semaine : "[SUJET]"
- Contenus publiés : 1 article + 2 vidéos TikTok

Format :
- Objet email (2 versions A/B)
- Corps avec structure CaptenTDB Weekly standard
- Ton : ami qui suit les marchés pour toi
- CTA final : "Invite un ami"
- 350–500 mots, disclaimer légal footer`,
      },

      // ─── GENERAL ────────────────────────────────────────────────────────────
      {
        id: 'general-brainstorm',
        category: 'general',
        title: 'Brainstorming contenu d\'urgence',
        description: 'Génère 5 idées de contenu rapidement — une par canal.',
        prompt: `Je dois créer du contenu pour CaptenTDB aujourd'hui mais je manque d'idées.

Génère 5 idées de contenu rapides (< 2h de création chacune) pour :
- TikTok (1 idée)
- Twitter/X (1 idée — thread ou tweet)
- Blog (1 idée — article court 800 mots)
- Newsletter (1 idée — section "actif spotlight")
- Instagram Stories (1 idée)

Contexte : on est le [DATE], les marchés sont [HAUSSIERS/BAISSIERS].
Cible principale : [Lucas / Camille / Mehdi].
Contrainte : ne jamais promettre de gains, angle toujours éducatif.`,
      },
      {
        id: 'general-nouvelle-video',
        category: 'general',
        title: 'Créer une nouvelle vidéo Remotion',
        description: 'Template générique pour décrire n\'importe quelle nouvelle vidéo à Claude.',
        prompt: `Dans le projet Remotion my-video (C:\\Users\\Utilisateur\\my-video),
crée une nouvelle composition "[NOM]".

Format : [16:9 ou 9:16] · [1920×1080 ou 1080×1920] · 60fps · [DURÉE]s

Ce que la vidéo doit montrer :
[Décris scène par scène avec les timecodes — ex: "00-03s : ..." / "03-08s : ..."]

Branding : couleurs depuis les constantes existantes. Fond : #05060f. Accent : #6366f1. Texte : blanc.
Ajoute la composition dans Root.tsx et explique la structure du code.`,
      },
    ],

    phaseChecklists: [
      {
        phase: 'Phase 1 — Fondations',
        period: 'M1–M2 — À faire maintenant',
        tasks: [
          'Créer le compte TikTok (@captentdb ou similaire)',
          'Créer le compte X/Twitter',
          'Installer Google Analytics 4 sur le site',
          'Connecter Google Search Console',
          'Exporter la vidéo CaptentDBTikTok (npx remotion render CaptentDBTikTok) → 1ère vidéo TikTok',
          'Exporter la vidéo CaptentDB (npx remotion render CaptentDB) → publier sur YouTube',
          'Publier le 1er article de blog (cluster "Apprendre le trading")',
          'Mettre en place la séquence email de bienvenue (7 emails) via Brevo',
          'Créer le Guide PDF débutant (Lead Magnet #1) — utilise le prompt dans la section Prompts',
          'Ajouter la preuve sociale sur la landing page ("28 000 traders actifs")',
          'Publier 3 vidéos TikTok la première semaine (utilise les scripts des Prompts)',
          'Ajouter le disclaimer légal en pied de page du site',
        ],
      },
      {
        phase: 'Phase 2 — Traction',
        period: 'M3–M5',
        tasks: [
          'Lancer le mini-cours email 7 jours (Lead Magnet #2)',
          'Atteindre 5K abonnés TikTok',
          'Publier 20 articles de blog',
          'Contacter 3 créateurs YouTube finance FR (< 50K abonnés) pour partenariat',
          'Lancer Meta Ads (150€/mois) sur Instagram Reels',
          'Créer le Quiz "Quel type d\'investisseur es-tu ?" (Lead Magnet #4)',
        ],
      },
      {
        phase: 'Phase 3 — Scale',
        period: 'M6–M12',
        tasks: [
          'Préparer Product Hunt launch (3 semaines de préparation)',
          'Lancer Google Ads Search (200€/mois)',
          'Créer programme de referral dans le produit',
          'Lancer Discord si > 500 membres',
          'Viser couverture presse : TechCrunch FR, BFM Business',
          'Enquête NPS trimestrielle',
          'Objectif : 10 000 utilisateurs actifs',
        ],
      },
    ],

    redFlags: [
      {
        action: '"Multiplie ton capital par 10" ou tout équivalent',
        reason: 'Interdit AMF/ACPR, perte de crédibilité immédiate et risque légal.',
      },
      {
        action: 'Afficher des performances passées sans disclaimer',
        reason: 'Non-conforme à la réglementation financière française.',
      },
      {
        action: '"Signaux gagnants garantis"',
        reason: 'Impossible à garantir, attire les mauvais utilisateurs, risque légal.',
      },
      {
        action: 'Fausse urgence ("Offre expire ce soir", "Places limitées")',
        reason: 'Perte de confiance durable si l\'utilisateur s\'en rend compte.',
      },
      {
        action: 'Cibler des mineurs avec du contenu financier',
        reason: 'Risque légal et éthique.',
      },
      {
        action: 'Partenariats avec des courtiers non régulés',
        reason: 'Responsabilité légale et réputation.',
      },
      {
        action: '"Revenus passifs", "liberté financière", vocabulaire MLM',
        reason: 'Fuit le public cible éduqué, associé aux arnaques.',
      },
    ],

    riskRegister: [
      {
        risk: 'Dépendance à un seul canal (SEO ou social)',
        mitigation: 'Répartition budget 40/30/20/10 et revue mensuelle attribution',
        owner: 'Head of Growth',
      },
      {
        risk: 'Message perçu comme "promesse de gains"',
        mitigation: 'Disclaimer systématique + comité conformité éditoriale',
        owner: 'Content Lead',
      },
      {
        risk: 'Baisse de délivrabilité email',
        mitigation: 'Warm-up domaine + nettoyage liste + segmentation active',
        owner: 'CRM Manager',
      },
      {
        risk: 'Algorithme TikTok pénalise le contenu finance',
        mitigation: 'Diversifier sur YouTube Shorts + Instagram Reels en parallèle',
        owner: 'Social',
      },
    ],
  };
}
