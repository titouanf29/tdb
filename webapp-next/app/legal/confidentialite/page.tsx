import { Metadata } from 'next';
import { SectionIntro } from '@/components/section-intro';

export const metadata: Metadata = {
  title: 'Politique de confidentialite',
  description: 'Politique de confidentialite et gestion des donnees utilisateur TDB.',
};

export default function ConfidentialitePage() {
  return (
    <main className="container page-stack">
      <SectionIntro
        eyebrow="Legal"
        title="Politique de confidentialite"
        text="Modele de page a finaliser avec les finalites de collecte, durees de conservation et droits utilisateurs."
      />

      <section className="panel" style={{ marginTop: '1rem', padding: '1rem' }}>
        <p className="section-text">
          Les clics CTA peuvent etre mesures a des fins d optimisation produit. Aucune promesse de performance
          financiere n est communiquee.
        </p>
      </section>
    </main>
  );
}