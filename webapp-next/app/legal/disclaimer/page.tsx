import { Metadata } from 'next';
import { SectionIntro } from '@/components/section-intro';

export const metadata: Metadata = {
  title: 'Disclaimer legal',
  description: 'Cadre legal et limites d usage du bot TDB.',
};

export default function DisclaimerPage() {
  return (
    <main className="container page-stack">
      <SectionIntro
        eyebrow="Legal"
        title="Disclaimer"
        text="Le bot TDB ne fournit pas de conseils financiers. Les analyses, alertes et simulations sont purement educatives."
      />

      <section className="legal-panel" style={{ marginTop: '1rem' }}>
        <h2>Informations importantes</h2>
        <p>
          Vous restez seul responsable de vos decisions. Le trading comporte des risques de perte en capital.
          TDB ne garantit aucun resultat.
        </p>
      </section>
    </main>
  );
}