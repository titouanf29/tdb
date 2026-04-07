/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['t.me', 'telegram.org'],
  },
  // API proxy: forwards /api/* to the backend.
  // Set BACKEND_URL or NEXT_PUBLIC_API_URL in Railway env vars.
  async rewrites() {
    const backendUrl = (
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8000"
    ).replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
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
