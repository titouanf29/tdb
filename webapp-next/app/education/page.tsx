import { Metadata } from 'next';
import { InfoCard } from '@/components/info-card';
import { SectionIntro } from '@/components/section-intro';
import { educationCards } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Education trading',
  description: 'Bases, indicateurs, gestion du risque et psychologie du trading.',
};

export default function EducationPage() {
  return (
    <main className="container page-stack">
      <SectionIntro
        eyebrow="Education"
        title="Apprendre avant d executer"
        text="Un espace pedagogique pour comprendre les signaux et progresser sans pression."
      />

      <section className="page-grid">
        {educationCards.map((card) => (
          <InfoCard key={card.title} title={card.title} body={card.body} />
        ))}
      </section>
    </main>
  );
}