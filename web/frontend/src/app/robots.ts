import type { MetadataRoute } from "next";

/*
 * Ce que les moteurs de recherche peuvent lire : la présentation, les leçons
 * et les pages légales. L'espace connecté n'a rien à faire dans un index (il
 * renvoie vers la connexion), ni l'API.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://captentdb.fr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/cours", "/lecon/", "/actifs", "/actif/", "/mentions-legales", "/politique-de-confidentialite", "/cgu", "/cgv"],
      disallow: ["/api/", "/admin", "/dashboard", "/wallet", "/trading", "/journal", "/favorites", "/portfolio",
                 "/analysis", "/scanner", "/strategie", "/markets", "/macro", "/learn", "/assistant", "/community",
                 "/support", "/settings", "/premium", "/semaine", "/nimbo", "/verify-email", "/reset-password"],
    }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
