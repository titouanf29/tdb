import Link from 'next/link';
import { Metadata } from 'next';
import { CtaButton } from '@/components/cta-button';
import { InfoCard } from '@/components/info-card';
import { LiveDemo } from '@/components/live-demo';
import { OpportunitiesWidget } from '@/components/opportunities-widget';
import { OnboardingModal } from '@/components/onboarding-modal';
import { faqItems, featureCards, siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Assistant IA pour analyser les marchés financiers',
  description: siteConfig.description,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: 'TDB',
      description: siteConfig.description,
      inLanguage: 'fr-FR',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${siteConfig.url}/#app`,
      name: 'TDB — Assistant IA Trading',
      description: siteConfig.description,
      url: siteConfig.url,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Telegram',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
      },
      featureList: [
        'Analyse IA multi-marchés',
        'Scan en temps réel',
        'Alertes Telegram instantanées',
        'Paper trading wallet virtuel 10 000$',
        'Gestion du risque automatique',
        'Éducation trading intégrée',
      ],
    },
  ],
};

const steps = [
  'Rejoindre le bot Telegram',
  'Configurer son profil',
  'Recevoir des analyses et opportunités',
  "S'entraîner avec le paper trading",
];

const previews = [
  { title: 'Menu du bot', body: '/start, dashboard, alertes et wallet' },
  { title: "Analyse d'actif", body: 'Signal détaillé avec score et risque' },
  { title: 'Opportunité détectée', body: 'Entrée, invalidation et logique de setup' },
  { title: 'Wallet virtuel', body: 'PnL, win rate et suivi de progression' },
];

const education = [
  { title: 'Bases du trading', body: 'Structure de marché, tendances et exécution' },
  { title: 'Indicateurs expliqués', body: 'SMA200, Ichimoku, VIX, momentum et volume' },
  { title: 'Gestion du risque', body: 'Position sizing, stops et drawdown control' },
  { title: 'Psychologie', body: 'Discipline, routine et biais comportementaux' },
];

export default function HomePage() {
  return (
    <main>
      <OnboardingModal />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="container hero">
        <div>
          <p className="pill">Bot IA trading pedagogique</p>
          <h1>{siteConfig.tagline}</h1>
          <p className="section-text">{siteConfig.description}</p>
          <div className="actions">
            <CtaButton
              href={siteConfig.telegramUrl}
              location="hero"
              targetLabel="telegram"
              external
            >
              Rejoindre le bot Telegram
            </CtaButton>
            <CtaButton href="/fonctionnalites" location="hero" targetLabel="features" variant="secondary">
              Découvrir les fonctionnalités
            </CtaButton>
          </div>
          <div className="proof-row">
            <span>25+ indicateurs</span>
            <span>Score opportunité 0 à 100</span>
            <span>Paper trading 10 000$</span>
          </div>
        </div>

        <aside className="signal-card">
          <h2>Signal IA | BTC/USD</h2>
          <p>Contexte : SMA200 haussière, VIX neutre, momentum positif</p>
          <div className="score-box">
            <strong>Score 82/100</strong>
            <span>Opportunité LONG détectée</span>
          </div>
          <ul>
            <li>Entrée : 68 420</li>
            <li>Risque : 1.2%</li>
            <li>Confiance : élevée</li>
          </ul>
        </aside>
      </section>

      <section className="container section-block">
        <div className="title-row">
          <h2>Démo interactive</h2>
          <Link href="/education">Apprendre à lire les signaux</Link>
        </div>
        <LiveDemo />
      </section>

      <section className="container section-block">
        <div className="title-row">
          <h2>Opportunités en temps réel</h2>
          <span className="section-subtitle">Top actifs détectés par l&apos;IA</span>
        </div>
        <OpportunitiesWidget />
      </section>

      <section className="container section-block">
        <div className="title-row">
          <h2>Fonctionnalités</h2>
          <Link href="/fonctionnalites">Voir la page détaillée</Link>
        </div>
        <div className="grid cards-grid">
          {featureCards.map((card) => (
            <InfoCard key={card.title} title={card.title} body={card.body} />
          ))}
        </div>
      </section>

      <section className="container section-block">
        <div className="title-row">
          <h2>Comment ça marche</h2>
          <Link href="/comment-ca-marche">Voir le parcours complet</Link>
        </div>
        <div className="grid steps-grid">
          {steps.map((step, index) => (
            <article key={step} className="step-card">
              <span>{index + 1}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container section-block">
        <div className="title-row">
          <h2>Aperçu du bot</h2>
          <Link href="/apercu-bot">Voir tous les écrans</Link>
        </div>
        <div className="grid cards-grid">
          {previews.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} />
          ))}
        </div>
      </section>

      <section className="container section-block">
        <div className="title-row">
          <h2>Éducation trading</h2>
          <Link href="/education">Voir la bibliothèque</Link>
        </div>
        <div className="grid cards-grid">
          {education.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} />
          ))}
        </div>
      </section>

      <section className="container section-block cta-panel">
        <h2>Communauté Discord</h2>
        <p>Analyses, discussions, annonces et support dans un même espace.</p>
        <CtaButton href={siteConfig.discordUrl} location="community" targetLabel="discord" external>
          Rejoindre Discord
        </CtaButton>
      </section>

      <section className="container section-block">
        <div className="title-row">
          <h2>FAQ</h2>
          <Link href="/faq">Voir la FAQ complete</Link>
        </div>
        <div className="faq-wrap">
          {faqItems.map((item) => (
            <details className="faq-item" key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="container section-block legal-panel">
        <h2>Disclaimer légal</h2>
        <p>
          Le bot TDB ne fournit pas de conseils financiers. Les analyses, alertes et simulations sont
          purement éducatives.
        </p>
      </section>
    </main>
  );
}