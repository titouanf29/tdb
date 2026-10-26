import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { fiche } from "@/lib/cours/catalogue";
import { CHARGEURS } from "@/lib/cours/lecons";
import { place } from "@/lib/cours/liens";
import { LeconVue } from "@/components/cours/LeconVue";
import { EmptyState } from "@/components/design-system";

/*
 * LA LEÇON EST RENDUE PAR LE SERVEUR.
 *
 * Elle était chargée dans le navigateur, après coup : la page que recevait
 * Google ne contenait que « Chargement de la leçon… ». Les 37 leçons, la
 * meilleure porte d'entrée du site, étaient invisibles pour les moteurs de
 * recherche et les aperçus de liens. Le serveur charge maintenant la leçon et
 * envoie son texte complet ; les graphiques et les outils s'animent ensuite
 * dans le navigateur, comme avant.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://captentdb.fr";

// Next 15 : les paramètres d'une page rendue sur le serveur arrivent en promesse.
type Props = { params: Promise<{ numero: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { numero } = await params;
  const f = fiche(Number(numero));
  if (!f) return { title: "Leçon introuvable", robots: { index: false } };
  const p = place(f.numero);
  // Le gabarit du site ajoute « · CaptenTDB » : le titre ne le répète pas.
  const titre = `${f.titre} : leçon de bourse gratuite`;
  return {
    title: titre,
    description: f.resume,
    alternates: { canonical: `/lecon/${f.numero}` },
    openGraph: {
      type: "article",
      title: f.titre,
      description: f.resume,
      url: `/lecon/${f.numero}`,
      locale: "fr_FR",
      siteName: "CaptenTDB",
      section: p?.titreChapitre,
    },
    twitter: { card: "summary_large_image", title: f.titre, description: f.resume },
  };
}

export default async function Page({ params }: Props) {
  const { numero } = await params;
  const n = Number(numero);
  const f = fiche(n);
  const charger = CHARGEURS[n];

  if (!f || !charger) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <EmptyState
          title={f ? `${f.titre} arrive très bientôt` : "Cette leçon n'existe pas"}
          description="Retrouvez toutes les leçons du parcours."
        />
        <Link href="/cours" className="cap-lien mt-6 inline-block">Voir toutes les leçons</Link>
      </div>
    );
  }

  const lecon = (await charger()).default;
  const p = place(n);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // Ce que Google lit pour reconnaître un cours : un contenu pédagogique
  // gratuit, en français, rattaché au parcours.
  const donnees = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: f.titre,
    description: f.resume,
    inLanguage: "fr",
    url: `${SITE}/lecon/${n}`,
    learningResourceType: "Leçon",
    educationalLevel: "Débutant",
    timeRequired: `PT${parseInt(f.duree, 10) || 10}M`,
    isAccessibleForFree: true,
    isPartOf: { "@type": "Course", name: p ? `${p.titreChapitre}, le parcours CaptenTDB` : "Le parcours CaptenTDB", url: `${SITE}/cours` },
    provider: { "@type": "Organization", name: "CaptenTDB", url: SITE },
  };

  return (
    <>
      <script type="application/ld+json" nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(donnees).replace(/</g, "\\u003c") }} />
      <LeconVue lecon={lecon} />
    </>
  );
}
