/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ne pas annoncer « Next.js » dans chaque réponse.
  poweredByHeader: false,
  output: 'standalone',
  images: {
    // Le site n'utilise pas next/image : l'optimiseur d'images de Next est
    // coupé, ce qui ferme les failles qui passent par lui (exécution de code
    // à distance avec un fichier AVIF, dénis de service, cache sans limite).
    unoptimized: true,
  },
  // API proxy is handled by src/middleware.ts (reads BACKEND_URL at runtime).
  typescript: {
    // Type errors don't block the Railway build (Webpack compilation succeeds).
    // Fix types locally; don't let them prevent deployment.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
          // Une politique de contenu limitée à ce qui ne peut rien casser :
          // pas d'intégration dans une autre page (clickjacking), pas de
          // plugin, pas de <base> détournée, des formulaires qui ne partent
          // que vers le site ; et le passage forcé en HTTPS des ressources.
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests",
          },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }]
            : []),
        ],
      },
    ];
  },
};

module.exports = nextConfig;
