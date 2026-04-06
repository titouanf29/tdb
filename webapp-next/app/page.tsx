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
      <section className="hero-shell">
        <div className="hero-backdrop" aria-hidden="true">
          <span className="hero-grid" />
          <span className="hero-orb hero-orb-1" />
          <span className="hero-orb hero-orb-2" />
        </div>
        <div className="container hero">
          <div className="hero-content">
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
                D&eacute;couvrir les fonctionnalit&eacute;s
              </CtaButton>
            </div>
            <div className="proof-row">
              <span className="proof-pill">25+ indicateurs</span>
              <span className="proof-pill">Score opportunit&eacute; 0 &agrave; 100</span>
              <span className="proof-pill">Paper trading 10 000$</span>
            </div>
          </div>

          <aside className="hero-visual">
            <div className="hero-ticker" aria-hidden="true">
              <div className="hero-ticker-track">
                <span>BTC +2.4%</span>
                <span>ETH +1.8%</span>
                <span>SPX -0.3%</span>
                <span>GOLD +0.6%</span>
                <span>EUR/USD +0.2%</span>
                <span aria-hidden="true">BTC +2.4%</span>
                <span aria-hidden="true">ETH +1.8%</span>
                <span aria-hidden="true">SPX -0.3%</span>
                <span aria-hidden="true">GOLD +0.6%</span>
                <span aria-hidden="true">EUR/USD +0.2%</span>
              </div>
            </div>

            <div className="signal-card hero-terminal">
              <div className="signal-top">
                <span className="signal-badge">Signal IA</span>
                <span className="signal-time">Mise &agrave; jour : 2 min</span>
              </div>
              <h2>BTC/USD</h2>
              <p>Contexte : SMA200 haussi&egrave;re, VIX neutre, momentum positif</p>
              <div className="score-box">
                <strong>Score 82/100</strong>
                <span>Opportunit&eacute; LONG d&eacute;tect&eacute;e</span>
              </div>
              <ul className="signal-list">
                <li>Entr&eacute;e : 68 420</li>
                <li>Risque : 1.2%</li>
                <li>Confiance : &eacute;lev&eacute;e</li>
              </ul>
            </div>

            <div className="hero-bars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </aside>
        </div>
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