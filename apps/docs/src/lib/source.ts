// Minimal source configuration for documentation
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
  getPage: (slug: string[]) => {
    // For now, return null - pages will be handled directly by the page component
    return null;
  },
  generateParams: () => {
    // Return basic page routes
    return [
      { slug: [] },
      { slug: ['getting-started'] },
      { slug: ['api'] },
      { slug: ['api', 'users'] },
    ];
  },
};

// Placeholder for OpenAPI integration - will be enhanced in next step
export const openapi = {
  getPage: () => null,
  generateParams: () => [],
};

export default source; 