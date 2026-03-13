import { Metadata } from 'next';
import { CtaButton } from '@/components/cta-button';
import { SectionIntro } from '@/components/section-intro';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Communaute',
  description: 'Rejoignez la communaute Discord TDB pour analyses, discussions et support.',
};

const topics = [
  'Canaux analyses multi-marches',
  'Discussions entre membres et retours setup',
  'Annonces produit et roadmap',
  'Support onboarding et usage du bot',
];

export default function CommunautePage() {
  return (
    <main className="container page-stack">
      <SectionIntro
        eyebrow="Communaute"
        title="Un Discord actif pour progresser"
        text="Le bot Telegram est le moteur. La communaute Discord est l espace d echange et de progression."
      >
        <div className="actions">
          <CtaButton href={siteConfig.discordUrl} location="community_page" targetLabel="discord" external>
            Rejoindre Discord
          </CtaButton>
        </div>
      </SectionIntro>

      <section className="page-grid">
        {topics.map((topic) => (
          <article key={topic} className="card">
            <h3>{topic}</h3>
            <p>Acces direct depuis la communaute officielle TDB.</p>
          </article>
        ))}
      </section>
    </main>
  );
}