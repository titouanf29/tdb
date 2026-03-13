import { Metadata } from 'next';
import { InfoCard } from '@/components/info-card';
import { SectionIntro } from '@/components/section-intro';

export const metadata: Metadata = {
  title: 'Apercu du bot',
  description: 'Exemples de menu, signaux, opportunites et wallet virtuel.',
};

const previews = [
  {
    title: 'Menu du bot',
    body: 'Navigation rapide entre dashboard, alertes, scan et wallet.',
  },
  {
    title: 'Analyse d actif',
    body: 'Signal detaille avec score opportunite, tendance et niveau de risque.',
  },
  {
    title: 'Opportunite detectee',
    body: 'Point d entree, invalidation, contexte et type de setup.',
  },
  {
    title: 'Wallet virtuel',
    body: 'Historique des positions, PnL et progression.',
  },
];

export default function ApercuBotPage() {
  return (
    <main className="container page-stack">
      <SectionIntro
        eyebrow="Produit"
        title="Apercu du bot Telegram"
        text="Visualisez la logique de TDB avant de demarrer."
      />

      <section className="page-grid">
        {previews.map((item) => (
          <InfoCard key={item.title} title={item.title} body={item.body} />
        ))}
      </section>
    </main>
  );
}