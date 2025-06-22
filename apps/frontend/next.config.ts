// apps/frontend/next.config.ts

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Expose the backend base URL to the client
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },

  async rewrites() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            // Matches "anything.localhost:3000"
            value: ':[subdomain].localhost:3000',
          },
        ],
        destination: '/:path*',
      },
    ];
  },
};

export default nextConfig;
