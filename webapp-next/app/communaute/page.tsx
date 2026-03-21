import { Metadata } from 'next';
import { CtaButton } from '@/components/cta-button';
import { SectionIntro } from '@/components/section-intro';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Communauté',
  description: 'Rejoignez la communauté Discord TDB pour analyses, discussions et support.',
};

const topics = [
  'Canaux analyses multi-marchés',
  'Discussions entre membres et retours setup',
  'Annonces produit et roadmap',
  'Support onboarding et usage du bot',
];

export default function CommunautePage() {
  return (
    <main className="container page-stack">
      <SectionIntro
        eyebrow="Communauté"
        title="Un Discord actif pour progresser"
        text="Le bot Telegram est le moteur. La communauté Discord est l'espace d'échange et de progression."
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
            <p>Accès direct depuis la communauté officielle TDB.</p>
          </article>
        ))}
      </section>
    </main>
  );
}