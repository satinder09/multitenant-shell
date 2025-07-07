// Clean source configuration for multitenant shell documentation
export const source = {
  pageTree: {
    name: 'Documentation',
    type: 'folder' as const,
    children: [
      {
        name: 'Introduction',
        type: 'page' as const,
        url: '/docs',
      },
      {
        name: 'Quick Start',
        type: 'page' as const,
        url: '/docs/quick-start',
      },
      {
        name: 'API Reference',
        type: 'folder' as const,
        children: [
          {
            name: 'Overview',
            type: 'page' as const,
            url: '/docs/api',
          },
          {
            name: 'Authentication',
            type: 'page' as const,
            url: '/docs/api/authentication',
          },
          {
            name: 'Tenants',
            type: 'page' as const,
            url: '/docs/api/tenants',
          },
          {
            name: 'Users',
            type: 'page' as const,
            url: '/docs/api/users',
          },
        ],
      },
    ],
  },
};

export default source; 