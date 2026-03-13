import { Metadata } from 'next';
import { SectionIntro } from '@/components/section-intro';

export const metadata: Metadata = {
  title: 'Mentions legales',
  description: 'Mentions legales du site officiel TDB.',
};

export default function MentionsLegalesPage() {
  return (
    <main className="container page-stack">
      <SectionIntro
        eyebrow="Legal"
        title="Mentions legales"
        text="Modele de page a completer avec la raison sociale, l hebergeur et les coordonnees officielles."
      />

      <section className="panel" style={{ marginTop: '1rem', padding: '1rem' }}>
        <p className="section-text">
          Editeur, directeur de publication, hebergeur, contact legal et numero d identification doivent etre
          renseignes avant mise en production.
        </p>
      </section>
    </main>
  );
}