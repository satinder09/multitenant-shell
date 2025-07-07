import { DomainConfig } from '../domain.types';

/**
 * Base Application Domain Configuration
 * 
 * This is a generic configuration template that can be customized for any application
 * built on the multitenant shell (CRM, Project Management, E-commerce, etc.)
 */
export const baseDomainConfig: DomainConfig = {
  // Basic Information
  id: 'my-application',
  type: 'custom',
  version: '1.0.0',
  
  // Branding
  branding: {
    name: 'My Application',
    shortName: 'MyApp',
    description: 'Complete business solution for modern companies',
    logo: '/images/logo.svg',
    favicon: '/favicon.ico',
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    socialImage: '/images/social.png',
    domain: 'docs.myapp.com'
  },
  
  // Navigation Structure
  navigation: {
    main: [
      {
        title: 'Overview',
        href: '/docs',
        icon: 'Home',
        description: 'Get started with the application'
      },
      {
        title: 'Getting Started',
        href: '/docs/getting-started',
        icon: 'Rocket',
        description: 'Quick setup and first steps',
        items: [
          { title: 'Quick Start', href: '/docs/getting-started/quickstart' },
          { title: 'Installation', href: '/docs/getting-started/installation' },
          { title: 'Configuration', href: '/docs/getting-started/configuration' },
          { title: 'First Steps', href: '/docs/getting-started/first-steps' }
        ]
      },
      {
        title: 'Features',
        href: '/docs/features',
        icon: 'Star',
        description: 'Explore core functionality',
        items: [
          { title: 'Core Features', href: '/docs/features/core' },
          { title: 'Advanced Features', href: '/docs/features/advanced' },
          { title: 'Reporting', href: '/docs/features/reporting' },
          { title: 'User Management', href: '/docs/features/users' }
        ]
      },
      {
        title: 'Integrations',
        href: '/docs/integrations',
        icon: 'Plug',
        description: 'Connect with third-party services',
        items: [
          { title: 'API Integrations', href: '/docs/integrations/api' },
          { title: 'Webhooks', href: '/docs/integrations/webhooks' },
          { title: 'Third-party Services', href: '/docs/integrations/services' }
        ]
      },
      {
        title: 'API Reference',
        href: '/docs/api',
        icon: 'Code',
        description: 'Complete API documentation'
      },
      {
        title: 'Tutorials',
        href: '/docs/tutorials',
        icon: 'BookOpen',
        description: 'Step-by-step guides'
      }
    ],
    footer: [
      { title: 'Support', href: '/docs/support' },
      { title: 'FAQ', href: '/docs/faq' },
      { title: 'Contact', href: '/docs/contact' }
    ]
  },
  
  // Features
  features: [
    {
      title: 'Core Functionality',
      description: 'Essential features for your business operations',
      icon: '⚡',
      plan: 'free',
      href: '/docs/features/core',
      category: 'core'
    },
    {
      title: 'Advanced Tools',
      description: 'Powerful tools for growing businesses',
      icon: '🛠️',
      plan: 'pro',
      href: '/docs/features/advanced',
      category: 'advanced'
    },
    {
      title: 'Reporting & Analytics',
      description: 'Insights and data visualization',
      icon: '📊',
      plan: 'pro',
      href: '/docs/features/reporting',
      category: 'reporting'
    },
    {
      title: 'API Access',
      description: 'Full REST API for custom integrations',
      icon: '🔌',
      plan: 'starter',
      href: '/docs/api',
      category: 'integration'
    },
    {
      title: 'Team Collaboration',
      description: 'Multi-user support and permissions',
      icon: '👥',
      plan: 'starter',
      href: '/docs/features/collaboration',
      category: 'core'
    },
    {
      title: 'Enterprise Features',
      description: 'Advanced security and compliance',
      icon: '🏢',
      plan: 'enterprise',
      href: '/docs/features/enterprise',
      category: 'advanced'
    }
  ],
  
  // API Configuration
  api: {
    baseUrl: 'https://api.myapp.com/v1',
    version: 'v1',
    authentication: {
      type: 'jwt',
      description: 'JWT Bearer token authentication'
    },
    endpoints: [
      // Core API endpoints
      { name: 'Get Items', path: '/items', method: 'GET', description: 'Retrieve all items', category: 'core', requiresAuth: true },
      { name: 'Create Item', path: '/items', method: 'POST', description: 'Create a new item', category: 'core', requiresAuth: true },
      { name: 'Get Item', path: '/items/{id}', method: 'GET', description: 'Get specific item', category: 'core', requiresAuth: true },
      { name: 'Update Item', path: '/items/{id}', method: 'PUT', description: 'Update existing item', category: 'core', requiresAuth: true },
      { name: 'Delete Item', path: '/items/{id}', method: 'DELETE', description: 'Delete item', category: 'core', requiresAuth: true },
      
      // User management
      { name: 'Get Users', path: '/users', method: 'GET', description: 'Retrieve all users', category: 'users', requiresAuth: true },
      { name: 'Create User', path: '/users', method: 'POST', description: 'Add new user', category: 'users', requiresAuth: true },
      { name: 'Get User Profile', path: '/users/{id}', method: 'GET', description: 'Get user details', category: 'users', requiresAuth: true },
      
      // Reporting
      { name: 'Get Reports', path: '/reports', method: 'GET', description: 'Generate reports', category: 'reports', requiresAuth: true },
      { name: 'Export Data', path: '/export', method: 'POST', description: 'Export application data', category: 'reports', requiresAuth: true }
    ]
  },
  
  // Integrations
  integrations: [
    {
      name: 'Email Service',
      description: 'Send automated emails and notifications',
      icon: '📧',
      category: 'email',
      href: '/docs/integrations/email',
      complexity: 'easy'
    },
    {
      name: 'Storage Service',
      description: 'Cloud storage for files and documents',
      icon: '☁️',
      category: 'storage',
      href: '/docs/integrations/storage',
      complexity: 'easy'
    },
    {
      name: 'Analytics',
      description: 'Track user behavior and application metrics',
      icon: '📈',
      category: 'analytics',
      href: '/docs/integrations/analytics',
      complexity: 'medium'
    },
    {
      name: 'Payment Processing',
      description: 'Accept payments and manage subscriptions',
      icon: '💳',
      category: 'payment',
      href: '/docs/integrations/payments',
      complexity: 'medium'
    }
  ],
  
  // Content Structure
  content: {
    homepage: {
      hero: {
        title: 'Application Documentation',
        subtitle: 'Everything you need to build, integrate, and scale your business application',
        ctaText: 'Get Started',
        ctaHref: '/docs/getting-started'
      },
      quickStart: {
        title: 'Quick Start',
        description: 'Get up and running in minutes',
        steps: [
          {
            title: 'Sign Up',
            description: 'Create your account and set up your workspace',
            href: '/docs/getting-started/signup'
          },
          {
            title: 'Configure',
            description: 'Set up your application preferences',
            href: '/docs/getting-started/setup'
          },
          {
            title: 'First Action',
            description: 'Perform your first key action',
            href: '/docs/getting-started/first-action'
          },
          {
            title: 'Explore Features',
            description: 'Discover what the application can do',
            href: '/docs/features'
          }
        ]
      }
    },
    sections: [
      {
        id: 'features',
        title: 'Features',
        description: 'Core application functionality',
        autoGenerate: true,
        template: 'feature'
      },
      {
        id: 'api',
        title: 'API Reference',
        description: 'Complete API documentation',
        autoGenerate: true,
        template: 'api'
      },
      {
        id: 'integrations',
        title: 'Integrations',
        description: 'Third-party integrations',
        autoGenerate: true,
        template: 'integration'
      }
    ]
  },
  
  // SEO and Meta
  seo: {
    title: 'Application Documentation - Complete Guide',
    description: 'Comprehensive documentation including API reference, tutorials, and integration guides',
    keywords: ['documentation', 'API', 'business application', 'integration', 'tutorial'],
    ogImage: '/images/og-image.png'
  }
}; 