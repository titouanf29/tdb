import Link from 'next/link';
import { Metadata } from 'next';
import { CtaButton } from '@/components/cta-button';
import { InfoCard } from '@/components/info-card';
import { faqItems, featureCards, siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Assistant IA pour analyser les marches financiers',
  description: siteConfig.description,
};

const steps = [
  'Rejoindre le bot Telegram',
  'Configurer son profil',
  'Recevoir des analyses et opportunites',
  'S entrainer avec le paper trading',
];

const previews = [
  { title: 'Menu du bot', body: '/start, dashboard, alertes et wallet' },
  { title: 'Analyse d actif', body: 'Signal detaille avec score et risque' },
  { title: 'Opportunite detectee', body: 'Entree, invalidation et logique de setup' },
  { title: 'Wallet virtuel', body: 'PnL, win rate et suivi de progression' },
];

const education = [
  { title: 'Bases du trading', body: 'Structure de marche, tendances et execution' },
  { title: 'Indicateurs expliques', body: 'SMA200, Ichimoku, VIX, momentum et volume' },
  { title: 'Gestion du risque', body: 'Position sizing, stops et drawdown control' },
  { title: 'Psychologie', body: 'Discipline, routine et biais comportementaux' },
];

export default function HomePage() {
  return (
    <main>
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
              Decouvrir les fonctionnalites
            </CtaButton>
          </div>
          <div className="proof-row">
            <span>25+ indicateurs</span>
            <span>Score opportunite 0 a 100</span>
            <span>Paper trading 10 000$</span>
          </div>
        </div>

        <aside className="signal-card">
          <h2>Signal IA | BTC/USD</h2>
          <p>Contexte: SMA200 haussiere, VIX neutre, momentum positif</p>
          <div className="score-box">
            <strong>Score 82/100</strong>
            <span>Opportunite LONG detectee</span>
          </div>
          <ul>
            <li>Entree: 68 420</li>
            <li>Risque: 1.2%</li>
            <li>Confiance: elevee</li>
          </ul>
        </aside>
      </section>

      <section className="container section-block">
        <div className="title-row">
          <h2>Fonctionnalites</h2>
          <Link href="/fonctionnalites">Voir la page detaillee</Link>
        </div>
        <div className="grid cards-grid">
          {featureCards.map((card) => (
            <InfoCard key={card.title} title={card.title} body={card.body} />
          ))}
        </div>
      </section>

      <section className="container section-block">
        <div className="title-row">
          <h2>Comment ca marche</h2>
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
          <h2>Apercu du bot</h2>
          <Link href="/apercu-bot">Voir tous les ecrans</Link>
        </div>
        <div className="grid cards-grid">
          {previews.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} />
          ))}
        </div>
      </section>

      <section className="container section-block">
        <div className="title-row">
          <h2>Education trading</h2>
          <Link href="/education">Voir la bibliotheque</Link>
        </div>
        <div className="grid cards-grid">
          {education.map((item) => (
            <InfoCard key={item.title} title={item.title} body={item.body} />
          ))}
        </div>
      </section>

      <section className="container section-block cta-panel">
        <h2>Communaute Discord</h2>
        <p>Analyses, discussions, annonces et support dans un meme espace.</p>
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
        <h2>Disclaimer legal</h2>
        <p>
          Le bot TDB ne fournit pas de conseils financiers. Les analyses, alertes et simulations sont
          purement educatives.
        </p>
      </section>
    </main>
  );
}