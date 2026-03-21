export const siteConfig = {
  name: 'TDB',
  tagline: 'Analyse IA des marchés financiers, en temps réel.',
  description:
    'TDB est un assistant IA pédagogique qui détecte les opportunités de trading, évalue les risques et accompagne votre progression via Telegram.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://captentdb.fr',
  telegramUrl: 'https://t.me/tdbcapten_bot',
  discordUrl: 'https://discord.gg/tdbcapten',
  contactEmail: 'contact@tdb.capten.ai',
};

export const navLinks = [
  { href: '/fonctionnalites', label: 'Fonctionnalités' },
  { href: '/comment-ca-marche', label: 'Comment ça marche' },
  { href: '/education', label: 'Éducation' },
  { href: '/communaute', label: 'Communauté' },
  { href: '/faq', label: 'FAQ' },
  { href: '/roadmap', label: 'Roadmap' },
];

export const featureCards = [
  {
    title: 'Analyse IA multi-marchés',
    body: 'Détection automatique des opportunités sur crypto, forex et indices avec un score de 0 à 100.',
  },
  {
    title: 'Scan en temps réel',
    body: "Surveillance continue des marchés et alertes instantanées sur Telegram dès qu'un setup se forme.",
  },
  {
    title: 'Indicateurs avancés',
    body: 'SMA200, Ichimoku, VIX, momentum et volume analysés simultanément pour une vision complète.',
  },
  {
    title: 'Paper trading',
    body: 'Wallet virtuel de 10 000$ pour pratiquer sans risque et mesurer sa progression.',
  },
  {
    title: 'Gestion du risque',
    body: "Calcul automatique du position sizing, niveaux d'invalidation et ratio risque/rendement.",
  },
  {
    title: 'Tableau de bord',
    body: 'Suivi du PnL, win rate, historique des trades et statistiques de performance.',
  },
];

export const educationCards = [
  {
    title: 'Bases du trading',
    body: "Structure de marché, tendances, niveaux clés et principes d'exécution.",
  },
  {
    title: 'Indicateurs expliqués',
    body: 'Comprendre et utiliser SMA200, Ichimoku, VIX, momentum et volume.',
  },
  {
    title: 'Gestion du risque',
    body: 'Position sizing, placement des stops et maîtrise du drawdown.',
  },
  {
    title: 'Psychologie du trading',
    body: 'Discipline, routine quotidienne et gestion des biais comportementaux.',
  },
  {
    title: 'Lecture des signaux',
    body: 'Interpréter les alertes TDB, valider un setup et décider sans émotion.',
  },
  {
    title: 'Analyse de marché',
    body: 'Méthodologie top-down, contexte macro et sélection des actifs à surveiller.',
  },
];

export const faqItems = [
  {
    q: 'TDB fournit-il des conseils financiers ?',
    a: "Non. TDB est un outil éducatif. Les analyses et alertes sont des indications pédagogiques, pas des conseils d'investissement.",
  },
  {
    q: 'Sur quels marchés le bot analyse-t-il ?',
    a: 'Crypto (BTC, ETH, altcoins majeurs), forex (paires principales) et indices (SP500, Nasdaq, CAC40).',
  },
  {
    q: 'Comment fonctionne le paper trading ?',
    a: "Chaque utilisateur dispose d'un wallet virtuel de 10 000$. Les trades sont simulés en temps réel sans argent réel.",
  },
  {
    q: 'Le bot est-il disponible 24h/24 ?',
    a: "Oui. Le scan automatique tourne en continu et les alertes sont envoyées dès qu'un signal est détecté.",
  },
  {
    q: 'Faut-il des connaissances en trading pour commencer ?',
    a: 'Non. La section éducation et les explications intégrées au bot sont conçues pour les débutants comme pour les confirmés.',
  },
  {
    q: 'Comment rejoindre la communauté ?',
    a: "Via le lien Discord disponible sur le site et dans le bot Telegram. L'accès est gratuit.",
  },
];
