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
  priority: 1 | 2 | 3;
};

export type QuarterPlan = {
  quarter: string;
  objective: string;
  keyMoves: string[];
  budgetEUR: number;
  expectedImpact: string;
};

export type Persona = {
  name: string;
  age: string;
  trigger: string;
  pains: string[];
  channels: string[];
  offer: string;
};

export type BudgetLine = {
  name: string;
  monthlyEUR: number;
  notes: string;
};

export type AdminPanelData = {
  generatedAt: string;
  northStar: string;
  confidentiality: string;
  strategy: {
    positioning: string;
    segments: string[];
    valueProps: string[];
    taglines: string[];
  };
  priorities: Array<{ title: string; detail: string; priority: 1 | 2 | 3 }>;
  personas: Persona[];
  kpis: KPI[];
  channels: ChannelPlan[];
  roadmap: QuarterPlan[];
  experiments: Experiment[];
  contentEngine: {
    weeklySlots: string[];
    seoClusters: string[];
    leadMagnets: string[];
    socialHooks: string[];
  };
  budget: {
    minimum: number;
    target: number;
    lines: BudgetLine[];
  };
  riskRegister: Array<{ risk: string; mitigation: string; owner: string }>;
};

export function getAdminPanelData(): AdminPanelData {
  return {
    generatedAt: new Date().toISOString(),
    northStar: '10 000 utilisateurs actifs / mois avec CAC soutenable et rétention M3 > 25%',
    confidentiality: 'Document interne admin · ne pas partager hors équipe CaptenTDB.',
    strategy: {
      positioning:
        'CaptenTDB = plateforme d’éducation trading assistée IA, orientée pratique, sans promesse de gain.',
      segments: [
        'Débutants 18-30 (social-first)',
        'Actifs 30-45 (SEO + newsletter)',
        'Autodidactes traders (communauté + outils)',
      ],
      valueProps: [
        'Apprentissage concret via scanner + wallet virtuel',
        'IA pédagogique en français',
        'Parcours sans jargon, sans paywall agressif',
      ],
      taglines: [
        'La bourse, enfin claire.',
        'Apprends à trader — avant d’investir un centime.',
        'L’IA analyse. Toi, tu comprends.',
      ],
    },
    priorities: [
      {
        title: 'TikTok & Reels éducatifs',
        detail: '3 à 5 vidéos/semaine, formats courts sur erreurs débutants, signaux IA, pédagogie sans hype.',
        priority: 1,
      },
      {
        title: 'SEO longue traîne',
        detail: 'Articles “comment lire RSI/MACD”, pages guides comparatives, FAQ riches et maillage interne.',
        priority: 1,
      },
      {
        title: 'Partenariats micro-influenceurs finance FR',
        detail: 'Cibler créateurs crédibles avec offre d’accès premium test + tracking UTM personnalisé.',
        priority: 2,
      },
      {
        title: 'Lead magnet + onboarding email',
        detail: 'Guide PDF + séquence 5 emails pour activer les inscrits et les ramener sur scanner/wallet.',
        priority: 2,
      },
    ],
    personas: [
      {
        name: 'Lucas — étudiant curieux',
        age: '20–25',
        trigger: 'Je veux comprendre avant de risquer de l’argent.',
        pains: ['Trop de jargon', 'Peur de perdre', 'Budget formation limité'],
        channels: ['TikTok', 'YouTube Shorts', 'Discord'],
        offer: 'Cours courts + scanner gratuit + wallet virtuel',
      },
      {
        name: 'Camille — salariée pragmatique',
        age: '28–38',
        trigger: 'Je veux apprendre efficacement sans arnaques.',
        pains: ['Manque de temps', 'Méfiance promesses', 'Besoin de méthode'],
        channels: ['SEO', 'Newsletter', 'LinkedIn'],
        offer: 'Playbook hebdo + rappels email + exercices guidés',
      },
      {
        name: 'Mehdi — trader débutant actif',
        age: '25–35',
        trigger: 'Je veux éviter les erreurs de débutant.',
        pains: ['Surtrading', 'Gestion risque faible', 'Signal/bruit'],
        channels: ['X', 'Telegram', 'Communauté'],
        offer: 'Scanner + checklist risque + revue hebdo',
      },
    ],
    kpis: [
      { id: 'traffic', label: 'Sessions organiques mensuelles', unit: 'count', m3: 18000, m6: 45000, m12: 120000, owner: 'SEO Lead' },
      { id: 'signup', label: 'Taux visite → inscription', unit: 'percent', m3: 4.2, m6: 5.5, m12: 7.5, owner: 'Growth PM' },
      { id: 'activation', label: 'Activation J+1 (1 scan + 1 analyse)', unit: 'percent', m3: 34, m6: 42, m12: 50, owner: 'Product' },
      { id: 'retention', label: 'Rétention M3', unit: 'percent', m3: 18, m6: 23, m12: 28, owner: 'Lifecycle' },
      { id: 'cac', label: 'CAC blended', unit: 'currency', m3: 14, m6: 11, m12: 8, owner: 'Paid Media' },
      { id: 'salesCycle', label: 'Cycle premium moyen', unit: 'days', m3: 28, m6: 21, m12: 14, owner: 'CRM' },
    ],
    channels: [
      {
        channel: 'SEO Programmatique',
        objective: 'Capturer intention haute sur requêtes éducatives trading/crypto',
        cadence: '2 contenus piliers + 6 satellites / mois',
        hooks: ['Guides “comment lire…”', 'Glossaires actionnables', 'Comparatifs d’outils'],
        cta: 'Tester un scan gratuit puis créer une watchlist.',
        priority: 1,
      },
      {
        channel: 'TikTok / Shorts',
        objective: 'Faire connaître la marque et générer des micro-conversions quotidiennes',
        cadence: '5 vidéos / semaine',
        hooks: ['Erreur de débutant du jour', 'Signal IA expliqué en 30s', 'Mythe vs réalité trading'],
        cta: 'Rejoindre la démo gratuite depuis bio.',
        priority: 1,
      },
      {
        channel: 'Newsletter',
        objective: 'Nurturing + réactivation + premium conversion',
        cadence: '2 envois / semaine',
        hooks: ['Top opportunités pédagogiques', 'Leçon marché de la semaine', 'Template de plan de trade'],
        cta: 'Démarrer un portefeuille virtuel.',
        priority: 2,
      },
      {
        channel: 'Community (Discord/Telegram)',
        objective: 'Rétention et preuve sociale',
        cadence: '1 live + 3 AMA / semaine',
        hooks: ['Debrief de session en direct', 'Challenges 7 jours', 'Q&A stratégie personnelle'],
        cta: 'Activer notifications scanner et rejoindre challenge.',
        priority: 3,
      },
    ],
    roadmap: [
      {
        quarter: 'Q2 2026',
        objective: 'Poser le moteur acquisition organique',
        keyMoves: ['Lancer 40 pages SEO clusterisées', 'Industrialiser templates vidéo short-form', 'Mettre en place dashboard growth hebdo'],
        budgetEUR: 900,
        expectedImpact: 'x2 trafic top-funnel + base email initiale',
      },
      {
        quarter: 'Q3 2026',
        objective: 'Accélérer activation et rétention',
        keyMoves: ['Refonte onboarding guidé par niveau', 'Nudges lifecycle J1/J3/J7', 'Challenges communautaires mensuels'],
        budgetEUR: 1200,
        expectedImpact: '+10 pts activation + +6 pts rétention 30j',
      },
      {
        quarter: 'Q4 2026',
        objective: 'Monétiser sans casser la confiance',
        keyMoves: ['Offre premium progressive', 'Preuves de valeur avant upsell', 'Funnel de trial 14 jours'],
        budgetEUR: 1500,
        expectedImpact: 'MRR initial + CAC stabilisé',
      },
      {
        quarter: 'Q1 2027',
        objective: 'Scale et partenariats',
        keyMoves: ['Programme ambassadeurs', 'Syndication contenu média', 'Optimisation LTV par cohortes'],
        budgetEUR: 2200,
        expectedImpact: 'Accélération croissance durable',
      },
    ],
    experiments: [
      {
        id: 'exp-hero-01',
        hypothesis: 'Un hero orienté “apprendre sans risque” augmente l’inscription.',
        metric: 'Signup rate landing',
        targetLift: '+15%',
        effort: 'S',
        window: '2 semaines',
      },
      {
        id: 'exp-onboard-02',
        hypothesis: 'Un onboarding en 3 questions améliore l’activation J+1.',
        metric: 'J+1 activation',
        targetLift: '+20%',
        effort: 'M',
        window: '3 semaines',
      },
      {
        id: 'exp-email-03',
        hypothesis: 'Une séquence email “7 jours / 7 leçons” améliore la rétention.',
        metric: 'Retention D30',
        targetLift: '+12%',
        effort: 'M',
        window: '4 semaines',
      },
      {
        id: 'exp-pricing-04',
        hypothesis: 'Un plan premium annuel avec garantie pédagogique augmente conversion.',
        metric: 'Trial → paid',
        targetLift: '+18%',
        effort: 'L',
        window: '6 semaines',
      },
    ],
    contentEngine: {
      weeklySlots: [
        'Lundi: Macro briefing + opportunités pédagogiques',
        'Mardi: Tutoriel scanner + cas pratique',
        'Mercredi: Short vidéo “erreur fréquente”',
        'Jeudi: Article SEO satellite + repurpose LinkedIn',
        'Vendredi: Live community + recap newsletter',
      ],
      seoClusters: ['Analyse technique débutant', 'Psychologie et gestion du risque', 'Crypto sans hype', 'Comparatifs outils et méthodes'],
      leadMagnets: ['Checklist “premier plan de trade”', 'Template journal de trading Notion', 'Mini-cours email 7 jours'],
      socialHooks: [
        '“3 erreurs qui te coûtent cher en trading”',
        '“RSI expliqué en 30 secondes”',
        '“Ce signal veut dire quoi concrètement ?”',
      ],
    },
    budget: {
      minimum: 10,
      target: 50,
      lines: [
        { name: 'Design & templates', monthlyEUR: 10, notes: 'Canva/mini outils visuels' },
        { name: 'Automation email', monthlyEUR: 15, notes: 'Séquences onboarding + newsletters' },
        { name: 'Boost contenu test', monthlyEUR: 25, notes: 'Amplification ciblée meilleurs posts' },
      ],
    },
    riskRegister: [
      {
        risk: 'Dépendance à un seul canal (SEO ou social)',
        mitigation: 'Répartition budget 40/30/20/10 et revue mensuelle attribution',
        owner: 'Head of Growth',
      },
      {
        risk: 'Message perçu comme “promesse de gains”',
        mitigation: 'Comité conformité éditoriale + disclaimers systématiques',
        owner: 'Content Lead',
      },
      {
        risk: 'Fuite de documents internes',
        mitigation: 'Accès admin strict + suppression des assets marketing publics',
        owner: 'Tech Lead',
      },
    ],
  };
}
