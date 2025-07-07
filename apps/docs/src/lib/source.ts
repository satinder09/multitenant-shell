// Simple source configuration for basic documentation
export const source = {
  pageTree: {
    name: 'Documentation',
    children: [
      {
        name: 'Introduction',
        url: '/docs',
        type: 'page' as const,
      },
      {
        name: 'Getting Started',
        url: '/docs/getting-started',
        type: 'page' as const,
      },
      {
        name: 'API Reference',
        url: '/docs/api',
        type: 'folder' as const,
        children: [
          {
            name: 'Overview',
            url: '/docs/api',
            type: 'page' as const,
          },
          {
            name: 'Users API',
            url: '/docs/api/users',
            type: 'page' as const,
          },
        ],
      },
    ],
  },
  // Simple page getter that doesn't exist - will be handled by the page component
  getPage: () => null,
  generateParams: () => [],
};

// For now, export null for openapi until we fix the integration
export const openapi = null;

export default source; 