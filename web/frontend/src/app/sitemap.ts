import type { MetadataRoute } from "next";
import { FICHES } from "@/lib/cours/catalogue";

// Les pages publiques : la présentation, les leçons de la série, le légal.
const SITE = "https://captentdb.fr";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/cours`, changeFrequency: "weekly", priority: 0.9 },
    ...FICHES.map((f) => ({ url: `${SITE}/lecon/${f.numero}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...["mentions-legales", "politique-de-confidentialite", "cgu", "cgv"].map((p) => ({ url: `${SITE}/${p}`, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
