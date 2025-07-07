// apps/frontend/next.config.ts

import type { NextConfig } from 'next';

// Environment Configuration
const frontendPort = process.env['NEXT_PUBLIC_FRONTEND_PORT'] || process.env['FRONTEND_PORT'] || '3000';
const baseDomain = process.env['NEXT_PUBLIC_BASE_DOMAIN'] || 'lvh.me';
const backendUrl = process.env['NEXT_PUBLIC_BACKEND_URL'] || `http://${baseDomain}:4000`;
const isDevelopment = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env['NEXT_PUBLIC_API_BASE_URL'] || backendUrl,
    NEXT_PUBLIC_BASE_DOMAIN: baseDomain,
    NEXT_PUBLIC_BACKEND_URL: backendUrl,
    NEXT_PUBLIC_FRONTEND_PORT: frontendPort,
    NEXT_PUBLIC_ENABLE_DEVTOOLS: isDevelopment ? 'true' : 'false',
  },

  // Image optimization
  images: {
    domains: [baseDomain, 'localhost', '127.0.0.1'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Security headers
  async headers() {
    const headers = [
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
        value: 'camera=(), microphone=(), geolocation=(), payment=()',
      },
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
    ];

    // Only add CSP in production or when explicitly enabled
    if (!isDevelopment || process.env['NEXT_PUBLIC_ENABLE_SECURITY_HEADERS'] === 'true') {
      headers.push({
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          `connect-src 'self' ${backendUrl}`,
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "object-src 'none'",
        ].join('; '),
      });
    }

    return [
      {
        source: '/(.*)',
        headers,
      },
    ];
  },

  // Rewrites for tenant subdomains
  async rewrites() {
    return [
      // Handle tenant subdomains
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
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
            value: `(.+)\\.localhost${frontendPort !== '80' && frontendPort !== '443' ? `:${frontendPort}` : ''}`,
          },
        ],
        destination: '/:path*',
      },
    ];
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Add any custom webpack configuration here
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },

  // Turbopack configuration (stable)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
};

export default nextConfig;
