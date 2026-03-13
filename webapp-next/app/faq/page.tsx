import { Metadata } from 'next';
import { SectionIntro } from '@/components/section-intro';
import { faqItems } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Questions frequentes sur TDB, ses analyses et son usage.',
};

export default function FaqPage() {
  return (
    <main className="container page-stack">
      <SectionIntro
        eyebrow="FAQ"
        title="Questions frequentes"
        text="Une reponse claire sur le fonctionnement et les limites du service."
      />

      <section className="faq-wrap">
        {faqItems.map((item) => (
          <details className="faq-item" key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </section>
    </main>
  );
}