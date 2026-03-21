import { Metadata } from 'next';
import { SectionIntro } from '@/components/section-intro';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales du site officiel TDB.',
};

export default function MentionsLegalesPage() {
  return (
    <main className="container page-stack">
      <SectionIntro
        eyebrow="Légal"
        title="Mentions légales"
        text="Informations légales relatives à l'éditeur et à l'hébergement du site TDB."
      />

      <section className="panel" style={{ marginTop: '1rem', padding: '2rem', lineHeight: '1.8' }}>

        <h2 style={{ marginBottom: '0.5rem' }}>Éditeur du site</h2>
        <p>
          Le site <strong>{siteConfig.url}</strong> est édité par :<br />
          <strong>TDB – Trading Dashboard Bot</strong><br />
          Projet personnel / indépendant<br />
          Contact : <a href={`mailto:${siteConfig.contactEmail}`} style={{ color: 'var(--accent)' }}>
            {siteConfig.contactEmail}
          </a>
        </p>

        <h2 style={{ margin: '1.5rem 0 0.5rem' }}>Directeur de la publication</h2>
        <p>Le directeur de la publication est le créateur et responsable du projet TDB.</p>

        <h2 style={{ margin: '1.5rem 0 0.5rem' }}>Hébergement</h2>
        <p>
          Ce site est hébergé par :<br />
          <strong>Railway</strong> – railway.app<br />
          340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
        </p>

        <h2 style={{ margin: '1.5rem 0 0.5rem' }}>Propriété intellectuelle</h2>
        <p>
          L'ensemble du contenu de ce site (textes, images, graphiques, logo, icônes) est la propriété
          exclusive de TDB, sauf mention contraire. Toute reproduction, distribution ou utilisation
          sans autorisation écrite est interdite.
        </p>

        <h2 style={{ margin: '1.5rem 0 0.5rem' }}>Limitation de responsabilité</h2>
        <p>
          TDB ne saurait être tenu responsable des dommages directs ou indirects causés au matériel de
          l'utilisateur lors de l'accès au site. Les informations présentes sur ce site sont fournies
          à titre informatif et éducatif uniquement. TDB ne fournit aucun conseil financier ou
          d'investissement.
        </p>

        <h2 style={{ margin: '1.5rem 0 0.5rem' }}>Droit applicable</h2>
        <p>
          Les présentes mentions légales sont soumises au droit français. En cas de litige, les
          tribunaux français sont seuls compétents.
        </p>

        <p style={{ marginTop: '2rem', opacity: 0.6, fontSize: '0.85rem' }}>
          Dernière mise à jour : mars 2025
        </p>
      </section>
    </main>
  );
}
