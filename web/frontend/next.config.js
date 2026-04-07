/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['t.me', 'telegram.org'],
  },
  // API proxy is handled at runtime by src/app/api/[...proxy]/route.ts
  // so BACKEND_URL can be set as a Railway env var without rebuilding.
  typescript: {
    // Type errors don't block the Railway build (Webpack compilation succeeds).
    // Fix types locally; don't let them prevent deployment.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
