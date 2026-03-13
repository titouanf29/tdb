import { Metadata } from 'next';
import { SectionIntro } from '@/components/section-intro';

export const metadata: Metadata = {
  title: 'Comment ca marche',
  description: 'Parcours utilisateur simple en 4 etapes pour demarrer avec TDB.',
};

const steps = [
  {
    title: 'Etape 1',
    body: 'Rejoindre le bot Telegram pour acceder au menu principal et aux modules d analyse.',
  },
  {
    title: 'Etape 2',
    body: 'Configurer votre profil: niveau, risque par position, style et preferences de marche.',
  },
  {
    title: 'Etape 3',
    body: 'Recevoir des analyses et opportunites notees de 0 a 100 avec contexte de marche.',
  },
  {
    title: 'Etape 4',
    body: 'Pratiquer avec 10 000$ virtuels, puis suivre votre progression dans le wallet.',
  },
];

export default function CommentCaMarchePage() {
  return (
    <main className="container page-stack">
      <SectionIntro
        eyebrow="Onboarding"
        title="Un parcours clair en 4 etapes"
        text="TDB a ete pense pour aller de la comprehension a l action sans friction."
      />

      <section className="page-grid">
        {steps.map((step, index) => (
          <article className="step-card" key={step.title}>
            <span>{index + 1}</span>
            <h3>{step.title}</h3>
            <p className="section-text">{step.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}