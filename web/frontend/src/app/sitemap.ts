import type { MetadataRoute } from "next";
import { FICHES } from "@/lib/cours/catalogue";
import { listeActifs } from "@/lib/actifs-serveur";

// Les pages publiques : la présentation, les leçons de la série, les analyses
// du jour, le légal. La liste des actifs vient du serveur ; s'il ne répond
// pas, le plan du site reste valide sans elles.
const SITE = "https://captentdb.fr";
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const actifs = await listeActifs();
  return [
    { url: `${SITE}/actifs`, changeFrequency: "daily", priority: 0.9 },
    ...actifs.map((a) => ({ url: `${SITE}/actif/${a.id}`, changeFrequency: "hourly" as const, priority: 0.8 })),
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/cours`, changeFrequency: "weekly", priority: 0.9 },
    ...FICHES.map((f) => ({ url: `${SITE}/lecon/${f.numero}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...["mentions-legales", "politique-de-confidentialite", "cgu", "cgv"].map((p) => ({ url: `${SITE}/${p}`, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
