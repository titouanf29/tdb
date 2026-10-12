import type { MetadataRoute } from "next";

/**
 * L'application installable : ce qu'un téléphone affiche quand on ajoute
 * CaptenTDB à l'écran d'accueil — le nom, le symbole sur fond bleu nuit, et
 * l'ouverture directement sur l'accueil, sans barre de navigateur.
 *
 * L'icône « maskable » a une marge plus large : Android la découpe en cercle
 * ou en goutte, et le symbole ne doit pas y perdre son point ambre.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CaptenTDB — apprendre le trading",
    short_name: "CaptenTDB",
    description: "Apprendre le trading sans risquer un euro, avec Nimbo.",
    lang: "fr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#F6F8FB",
    theme_color: "#0B1726",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
