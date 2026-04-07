/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['t.me', 'telegram.org'],
  },
  // API proxy is handled at runtime by src/app/api/[...proxy]/route.ts
  // so BACKEND_URL can be set as a Railway env var without rebuilding.
};

module.exports = nextConfig;
