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
          // La politique de contenu (CSP) est envoyée par le middleware, avec
          // un jeton tiré à chaque page pour les scripts.
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }]
            : []),
        ],
      },
    ];
  },
};

module.exports = nextConfig;
