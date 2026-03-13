import { Metadata } from 'next';
import { InfoCard } from '@/components/info-card';
import { SectionIntro } from '@/components/section-intro';
import { CtaButton } from '@/components/cta-button';
import { featureCards, siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Fonctionnalites',
  description: 'Analyse IA, scan automatique, alertes intelligentes, paper trading et wallet virtuel.',
};

export default function FonctionnalitesPage() {
  return (
    <main className="container page-stack">
      <SectionIntro
        eyebrow="Produit"
        title="Fonctionnalites TDB"
        text="Un socle d analyse IA pedagogique pour detecter des opportunites et apprendre une methode robuste."
      >
        <div className="actions">
          <CtaButton href={siteConfig.telegramUrl} location="features_page" targetLabel="telegram" external>
            Rejoindre Telegram
          </CtaButton>
        </div>
      </SectionIntro>

      <section className="page-grid">
        {featureCards.map((card) => (
          <InfoCard key={card.title} title={card.title} body={card.body} />
        ))}
      </section>
    </main>
  );
}