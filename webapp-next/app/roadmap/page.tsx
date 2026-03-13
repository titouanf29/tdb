import { Metadata } from 'next';
import { InfoCard } from '@/components/info-card';
import { SectionIntro } from '@/components/section-intro';

export const metadata: Metadata = {
  title: 'Roadmap',
  description: 'Prochaines evolutions TDB: dashboard, stats avancees et parrainage.',
};

const items = [
  {
    title: 'Dashboard utilisateur',
    body: 'Suivi centralise des alertes, performances et progression.',
  },
  {
    title: 'Statistiques avancees',
    body: 'Win rate par setup, expectancy, drawdown et courbe d equite.',
  },
  {
    title: 'Parrainage',
    body: 'Programme d invitation pour accelerer la croissance communautaire.',
  },
];

export default function RoadmapPage() {
  return (
    <main className="container page-stack">
      <SectionIntro
        eyebrow="Roadmap"
        title="Ce qui arrive ensuite"
        text="La plateforme evolue vers un espace complet de suivi et de progression trader."
      />

      <section className="page-grid">
        {items.map((item) => (
          <InfoCard key={item.title} title={item.title} body={item.body} />
        ))}
      </section>
    </main>
  );
}