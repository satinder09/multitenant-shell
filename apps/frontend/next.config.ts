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

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval and unsafe-inline in dev
              "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' " + (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'),
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
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
