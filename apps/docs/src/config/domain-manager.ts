import { DomainConfig } from './domain.types';
import { baseDomainConfig } from './domains/base.config';

/**
 * Domain Manager
 * 
 * Handles loading and managing different domain configurations
 * for various application types (CRM, Project Management, E-commerce, etc.)
 */
export class DomainManager {
  private static instance: DomainManager;
  private currentDomain: string;
  private configurations: Map<string, DomainConfig> = new Map();
  
  private constructor() {
    this.currentDomain = 'base';
    this.loadDefaultConfigurations();
  }
  
  static getInstance(): DomainManager {
    if (!DomainManager.instance) {
      DomainManager.instance = new DomainManager();
    }
    return DomainManager.instance;
  }
  
  /**
   * Load default configurations
   */
  private loadDefaultConfigurations(): void {
    this.configurations.set('base', baseDomainConfig);
  }
  
  /**
   * Register a new domain configuration
   */
  registerDomain(config: DomainConfig): void {
    this.configurations.set(config.id, config);
  }
  
  /**
   * Set the current active domain
   */
  setCurrentDomain(domainId: string): void {
    if (!this.configurations.has(domainId)) {
      throw new Error(`Domain configuration '${domainId}' not found`);
    }
    this.currentDomain = domainId;
  }
  
  /**
   * Get the current domain configuration
   */
  getCurrentDomain(): DomainConfig {
    const config = this.configurations.get(this.currentDomain);
    if (!config) {
      throw new Error(`Current domain configuration '${this.currentDomain}' not found`);
    }
    return config;
  }
  
  /**
   * Get a specific domain configuration
   */
  getDomain(domainId: string): DomainConfig | undefined {
    return this.configurations.get(domainId);
  }
  
  /**
   * Get all registered domain configurations
   */
  getAllDomains(): DomainConfig[] {
    return Array.from(this.configurations.values());
  }
  
  /**
   * Get domain configuration by type
   */
  getDomainsByType(type: string): DomainConfig[] {
    return this.getAllDomains().filter(config => config.type === type);
  }
  
  /**
   * Create a new domain configuration from a template
   */
  createFromTemplate(templateId: string, customizations: Partial<DomainConfig>): DomainConfig {
    const template = this.getDomain(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }
    
    // Deep merge template with customizations
    const newConfig: DomainConfig = {
      ...template,
      ...customizations,
      id: customizations.id || `${templateId}-custom`,
      branding: {
        ...template.branding,
        ...customizations.branding
      },
      navigation: {
        ...template.navigation,
        ...customizations.navigation
      },
      api: {
        ...template.api,
        ...customizations.api
      },
      content: {
        ...template.content,
        ...customizations.content
      },
      seo: {
        ...template.seo,
        ...customizations.seo
      }
    };
    
    return newConfig;
  }
  
  /**
   * Load domain configuration from environment or file
   */
  async loadFromEnvironment(): Promise<void> {
    const domainId = process.env.DOCS_DOMAIN || 'base';
    const configPath = process.env.DOCS_CONFIG_PATH;
    
    if (configPath) {
      try {
        const config = await import(configPath);
        this.registerDomain(config.default);
        this.setCurrentDomain(config.default.id);
      } catch (error) {
        console.warn(`Failed to load domain configuration from ${configPath}:`, error);
        this.setCurrentDomain(domainId);
      }
    } else {
      this.setCurrentDomain(domainId);
    }
  }
  
  /**
   * Generate navigation for current domain
   */
  generateNavigation() {
    const domain = this.getCurrentDomain();
    return {
      main: domain.navigation.main,
      footer: domain.navigation.footer
    };
  }
  
  /**
   * Generate API documentation structure
   */
  generateApiDocs() {
    const domain = this.getCurrentDomain();
    const categories = new Map<string, any[]>();
    
    // Group endpoints by category
    domain.api.endpoints.forEach(endpoint => {
      if (!categories.has(endpoint.category)) {
        categories.set(endpoint.category, []);
      }
      categories.get(endpoint.category)!.push(endpoint);
    });
    
    return {
      baseUrl: domain.api.baseUrl,
      version: domain.api.version,
      authentication: domain.api.authentication,
      categories: Object.fromEntries(categories),
      endpoints: domain.api.endpoints
    };
  }
  
  /**
   * Generate feature documentation
   */
  generateFeatureDocs() {
    const domain = this.getCurrentDomain();
    const categories = new Map<string, any[]>();
    
    // Group features by category
    domain.features.forEach(feature => {
      if (!categories.has(feature.category)) {
        categories.set(feature.category, []);
      }
      categories.get(feature.category)!.push(feature);
    });
    
    return {
      categories: Object.fromEntries(categories),
      features: domain.features
    };
  }
  
  /**
   * Generate integration documentation
   */
  generateIntegrationDocs() {
    const domain = this.getCurrentDomain();
    const categories = new Map<string, any[]>();
    
    // Group integrations by category
    domain.integrations.forEach(integration => {
      if (!categories.has(integration.category)) {
        categories.set(integration.category, []);
      }
      categories.get(integration.category)!.push(integration);
    });
    
    return {
      categories: Object.fromEntries(categories),
      integrations: domain.integrations
    };
  }
  
  /**
   * Export current domain configuration
   */
  exportConfiguration(): string {
    const domain = this.getCurrentDomain();
    return JSON.stringify(domain, null, 2);
  }
  
  /**
   * Validate domain configuration
   */
  validateConfiguration(config: DomainConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Required fields
    if (!config.id) errors.push('Domain ID is required');
    if (!config.type) errors.push('Domain type is required');
    if (!config.branding?.name) errors.push('Domain name is required');
    if (!config.navigation?.main) errors.push('Main navigation is required');
    if (!config.api?.baseUrl) errors.push('API base URL is required');
    
    // Navigation validation
    if (config.navigation?.main) {
      config.navigation.main.forEach((item, index) => {
        if (!item.title) errors.push(`Navigation item ${index} missing title`);
        if (!item.href) errors.push(`Navigation item ${index} missing href`);
      });
    }
    
    // API validation
    if (config.api?.endpoints) {
      config.api.endpoints.forEach((endpoint, index) => {
        if (!endpoint.name) errors.push(`API endpoint ${index} missing name`);
        if (!endpoint.path) errors.push(`API endpoint ${index} missing path`);
        if (!endpoint.method) errors.push(`API endpoint ${index} missing method`);
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const domainManager = DomainManager.getInstance();

// Export utility functions
export const getCurrentDomain = () => domainManager.getCurrentDomain();
export const generateNavigation = () => domainManager.generateNavigation();
export const generateApiDocs = () => domainManager.generateApiDocs();
export const generateFeatureDocs = () => domainManager.generateFeatureDocs();
export const generateIntegrationDocs = () => domainManager.generateIntegrationDocs(); 