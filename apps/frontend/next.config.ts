// apps/frontend/next.config.ts

import type { NextConfig } from 'next';

const frontendPort = process.env.FRONTEND_PORT || '3000';
const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Expose environment variables to the client
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_BASE_DOMAIN: process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me',
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  },

  async rewrites() {
    return [
      // Handle tenant subdomains
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            // Matches tenant subdomains like "tenant1.lvh.me:3000"
            value: `(.+)\\.${baseDomain.replace('.', '\\.')}${frontendPort !== '80' && frontendPort !== '443' ? `:${frontendPort}` : ''}`,
          },
        ],
        destination: '/:path*',
      },
      // Handle localhost with subdomains for development
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            // Matches "tenant1.localhost:3000"
            value: `(.+)\\.localhost${frontendPort !== '80' && frontendPort !== '443' ? `:${frontendPort}` : ''}`,
          },
        ],
        destination: '/:path*',
      },
    ];
  },
};

export default nextConfig;
