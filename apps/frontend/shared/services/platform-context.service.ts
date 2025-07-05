/**
 * 🏗️ PLATFORM CONTEXT SERVICE
 * 
 * This service manages tenant metadata resolution and platform context.
 * It provides a unified way to:
 * - Resolve tenant information from subdomains
 * - Cache tenant metadata for performance
 * - Handle platform vs tenant context switching
 * 
 * Focus: Platform management of tenant metadata (tenant-agnostic)
 */

import { getTenantSubdomain, isPlatformHost } from '@/shared/utils/contextUtils';
import { PlatformTenant } from '@/shared/types/platform.types';

interface TenantContextCache {
  [subdomain: string]: {
    tenant: PlatformTenant;
    timestamp: number;
  };
}

interface PlatformContextState {
  isPlatform: boolean;
  currentTenant: PlatformTenant | null;
  tenantSubdomain: string | null;
  baseDomain: string;
  isLoading: boolean;
  error: string | null;
}

export class PlatformContextService {
  private static instance: PlatformContextService;
  private tenantCache: TenantContextCache = {};
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private state: PlatformContextState = {
    isPlatform: true,
    currentTenant: null,
    tenantSubdomain: null,
    baseDomain: process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me',
    isLoading: false,
    error: null,
  };

  // Singleton pattern
  public static getInstance(): PlatformContextService {
    if (!PlatformContextService.instance) {
      PlatformContextService.instance = new PlatformContextService();
    }
    return PlatformContextService.instance;
  }

  private constructor() {
    // Initialize context on client-side
    if (typeof window !== 'undefined') {
      this.initializeContext();
    }
  }

  /**
   * Initialize platform context from current URL
   */
  private initializeContext(): void {
    const host = window.location.host;
    const tenantSubdomain = getTenantSubdomain(host);
    const isPlatform = isPlatformHost(host);

    this.state = {
      ...this.state,
      isPlatform,
      tenantSubdomain,
      currentTenant: null,
      isLoading: !!tenantSubdomain, // Loading if we have a subdomain to resolve
      error: null,
    };

    // If on tenant subdomain, resolve tenant metadata
    if (tenantSubdomain) {
      this.resolveTenantMetadata(tenantSubdomain);
    }
  }

  /**
   * Get current platform context state
   */
  public getContext(): PlatformContextState {
    return { ...this.state };
  }

  /**
   * Check if current context is platform (not tenant)
   */
  public isPlatformContext(): boolean {
    return this.state.isPlatform;
  }

  /**
   * Get current tenant subdomain
   */
  public getCurrentTenantSubdomain(): string | null {
    return this.state.tenantSubdomain;
  }

  /**
   * Get current tenant metadata
   */
  public getCurrentTenant(): PlatformTenant | null {
    return this.state.currentTenant;
  }

  /**
   * Get tenant ID from subdomain (for API calls)
   */
  public getCurrentTenantId(): string | null {
    if (this.state.currentTenant) {
      return this.state.currentTenant.id;
    }
    
    // Fallback: use subdomain as ID if tenant not resolved yet
    return this.state.tenantSubdomain;
  }

  /**
   * Get current state (for React integration)
   */
  public getState(): PlatformContextState {
    return { ...this.state };
  }

  /**
   * Refresh tenant metadata (public method for React integration)
   */
  public async refreshTenantMetadata(subdomain: string): Promise<void> {
    return this.resolveTenantMetadata(subdomain);
  }

  /**
   * Resolve tenant metadata from subdomain
   */
  private async resolveTenantMetadata(subdomain: string): Promise<void> {
    try {
      this.state.isLoading = true;
      this.state.error = null;

      // Check cache first
      const cached = this.tenantCache[subdomain];
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        this.state.currentTenant = cached.tenant;
        this.state.isLoading = false;
        return;
      }

      // Resolve tenant from platform API
      const tenant = await this.fetchTenantBySubdomain(subdomain);
      
      if (tenant) {
        // Cache the result
        this.tenantCache[subdomain] = {
          tenant,
          timestamp: Date.now(),
        };
        
        this.state.currentTenant = tenant;
      } else {
        this.state.error = `Tenant not found for subdomain: ${subdomain}`;
      }
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to resolve tenant metadata:', error);
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Fetch tenant metadata from platform API
   */
  private async fetchTenantBySubdomain(subdomain: string): Promise<PlatformTenant | null> {
    try {
      const response = await fetch(`/api/platform/tenants/by-subdomain/${subdomain}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Tenant not found
        }
        throw new Error(`Failed to fetch tenant: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching tenant by subdomain:', error);
      
      // For development: create a mock tenant if API fails
      if (process.env.NODE_ENV === 'development') {
        return {
          id: subdomain,
          name: `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} Tenant`,
          subdomain,
          url: `https://${subdomain}.${this.state.baseDomain}`,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          planType: 'development',
          features: ['basic'],
          userCount: 0,
        };
      }
      
      throw error;
    }
  }
}

// Export singleton instance
export const platformContextService = PlatformContextService.getInstance();

// Export convenience functions
export const getCurrentTenantId = () => platformContextService.getCurrentTenantId();
export const getCurrentTenant = () => platformContextService.getCurrentTenant(); 