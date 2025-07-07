/**
 * Domain Configuration Types
 * 
 * Defines the structure for configuring documentation for different application domains
 */

export interface NavigationItem {
  title: string;
  href: string;
  icon?: string;
  description?: string;
  items?: NavigationItem[];
}

export interface FeatureConfig {
  title: string;
  description: string;
  icon: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  href: string;
  category: 'core' | 'advanced' | 'integration' | 'reporting';
}

export interface APIEndpointConfig {
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  category: string;
  requiresAuth: boolean;
}

export interface IntegrationConfig {
  name: string;
  description: string;
  icon: string;
  category: 'payment' | 'email' | 'storage' | 'analytics' | 'communication' | 'other';
  href: string;
  complexity: 'easy' | 'medium' | 'advanced';
}

export interface BrandingConfig {
  name: string;
  shortName: string;
  description: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  socialImage?: string;
  domain?: string;
}

export interface DomainConfig {
  // Basic Information
  id: string;
  type: 'erp' | 'crm' | 'project-management' | 'e-commerce' | 'hr' | 'custom';
  version: string;
  
  // Branding
  branding: BrandingConfig;
  
  // Navigation Structure
  navigation: {
    main: NavigationItem[];
    footer?: NavigationItem[];
  };
  
  // Features
  features: FeatureConfig[];
  
  // API Configuration
  api: {
    baseUrl: string;
    version: string;
    endpoints: APIEndpointConfig[];
    authentication: {
      type: 'jwt' | 'api-key' | 'oauth';
      description: string;
    };
  };
  
  // Integrations
  integrations: IntegrationConfig[];
  
  // Content Structure
  content: {
    homepage: {
      hero: {
        title: string;
        subtitle: string;
        ctaText: string;
        ctaHref: string;
      };
      quickStart: {
        title: string;
        description: string;
        steps: Array<{
          title: string;
          description: string;
          href?: string;
        }>;
      };
    };
    
    // Auto-generated sections
    sections: Array<{
      id: string;
      title: string;
      description: string;
      autoGenerate: boolean;
      template?: string;
    }>;
  };
  
  // SEO and Meta
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImage?: string;
  };
}

export type DomainType = DomainConfig['type'];

// Template configurations for different domain types
export interface DomainTemplate {
  type: DomainType;
  name: string;
  description: string;
  features: string[];
  defaultSections: string[];
}

// Content generation configuration
export interface ContentGenerationConfig {
  domain: DomainConfig;
  outputDir: string;
  templates: {
    page: string;
    api: string;
    feature: string;
    integration: string;
  };
} 