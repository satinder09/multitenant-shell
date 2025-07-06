/**
 * 🏗️ ENHANCED PLATFORM CONTEXT SERVICE
 * 
 * High-performance tenant metadata resolution with:
 * - Stale-while-revalidate caching for instant responses
 * - LRU cache management with memory limits
 * - Exponential backoff retry logic with circuit breaker
 * - Comprehensive performance monitoring and alerts
 * - Typed error handling with user-friendly messages
 * 
 * Focus: Platform management of tenant metadata (tenant-agnostic)
 */

import { getTenantSubdomain, isPlatformHost } from '@/shared/utils/contextUtils';
import { PlatformTenant } from '@/shared/types/platform.types';
import { 
  TenantResolutionError, 
  TenantResolutionErrorFactory, 
  TenantResolutionErrorType 
} from './tenant-resolution-errors';
import { CachePerformanceMonitor } from './cache-performance-monitor';

interface TenantCacheEntry {
  tenant: PlatformTenant;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
}

interface PlatformContextState {
  isPlatform: boolean;
  currentTenant: PlatformTenant | null;
  tenantSubdomain: string | null;
  baseDomain: string;
  isLoading: boolean;
  error: TenantResolutionError | null;
}

interface PlatformContextConfig {
  cache: {
    maxSize: number;        // Maximum number of cached tenants
    staleThreshold: number; // Serve stale data after this time (ms)
    maxAge: number;         // Remove from cache after this time (ms)
  };
  retry: {
    maxAttempts: number;    // Maximum retry attempts
    baseDelay: number;      // Base delay for exponential backoff (ms)
    maxDelay: number;       // Maximum delay between retries (ms)
  };
  circuitBreaker: {
    errorThreshold: number; // Errors before circuit opens
    resetTimeout: number;   // Time before attempting reset (ms)
  };
  api: {
    timeout: number;        // Request timeout (ms)
  };
  monitoring: {
    enabled: boolean;       // Enable performance monitoring
    debugMode: boolean;     // Enable debug logging
  };
}

enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit open, failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back
}

interface CircuitBreakerData {
  state: CircuitBreakerState;
  failures: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export class PlatformContextService {
  private static instance: PlatformContextService;
  private tenantCache: Map<string, TenantCacheEntry> = new Map();
  private circuitBreaker: CircuitBreakerData;
  private performanceMonitor: CachePerformanceMonitor;
  private config: PlatformContextConfig;
  private state: PlatformContextState;
  private backgroundRefreshPromises: Map<string, Promise<void>> = new Map();

  private readonly defaultConfig: PlatformContextConfig = {
    cache: {
      maxSize: 50,
      staleThreshold: 2 * 60 * 1000,  // 2 minutes
      maxAge: 10 * 60 * 1000,         // 10 minutes
    },
    retry: {
      maxAttempts: 3,
      baseDelay: 1000,                // 1 second
      maxDelay: 8000,                 // 8 seconds
    },
    circuitBreaker: {
      errorThreshold: 5,
      resetTimeout: 30 * 1000,        // 30 seconds
    },
    api: {
      timeout: 5000,                  // 5 seconds
    },
    monitoring: {
      enabled: process.env.NODE_ENV === 'development',
      debugMode: process.env.DEBUG_PLATFORM === 'true',
    },
  };

  // Singleton pattern
  public static getInstance(config?: Partial<PlatformContextConfig>): PlatformContextService {
    if (!PlatformContextService.instance) {
      PlatformContextService.instance = new PlatformContextService(config);
    }
    return PlatformContextService.instance;
  }

  private constructor(config?: Partial<PlatformContextConfig>) {
    this.config = { ...this.defaultConfig, ...config };
    this.performanceMonitor = new CachePerformanceMonitor();
    this.circuitBreaker = this.initializeCircuitBreaker();
    this.state = this.initializeState();

    // Initialize context on client-side
    if (typeof window !== 'undefined') {
      this.initializeContext();
    }

    this.log('debug', 'Platform Context Service initialized', {
      config: this.config,
      cacheSize: this.tenantCache.size
    });
  }

  private initializeCircuitBreaker(): CircuitBreakerData {
    return {
      state: CircuitBreakerState.CLOSED,
      failures: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
    };
  }

  private initializeState(): PlatformContextState {
    return {
      isPlatform: true,
      currentTenant: null,
      tenantSubdomain: null,
      baseDomain: process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me',
      isLoading: false,
      error: null,
    };
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
      isLoading: !!tenantSubdomain,
      error: null,
    };

    this.log('debug', 'Context initialized', {
      host,
      isPlatform,
      tenantSubdomain
    });

    // If on tenant subdomain, resolve tenant metadata
    if (tenantSubdomain) {
      this.resolveTenantMetadata(tenantSubdomain).catch(error => {
        this.log('error', 'Failed to initialize tenant context', { error });
      });
    }
  }

  /**
   * Get current platform context state
   * @returns {PlatformContextState} Complete state object with tenant info, loading status, and errors
   * @example
   * ```typescript
   * const context = service.getContext();
   * console.log('Is platform?', context.isPlatform);
   * console.log('Current tenant:', context.currentTenant);
   * ```
   */
  public getContext(): PlatformContextState {
    return { ...this.state };
  }

  /**
   * Check if current context is platform (not tenant)
   * @returns {boolean} True if on platform domain, false if on tenant subdomain
   * @example
   * ```typescript
   * if (service.isPlatformContext()) {
   *   // Show platform-specific UI
   * } else {
   *   // Show tenant-specific UI
   * }
   * ```
   */
  public isPlatformContext(): boolean {
    return this.state.isPlatform;
  }

  /**
   * Get current tenant subdomain
   * @returns {string | null} The tenant subdomain or null if on platform
   * @example
   * ```typescript
   * const subdomain = service.getCurrentTenantSubdomain();
   * // Returns 'acme' for acme.example.com
   * ```
   */
  public getCurrentTenantSubdomain(): string | null {
    return this.state.tenantSubdomain;
  }

  /**
   * Get current tenant metadata
   * @returns {PlatformTenant | null} Complete tenant object or null if not resolved
   * @example
   * ```typescript
   * const tenant = service.getCurrentTenant();
   * if (tenant) {
   *   console.log('Tenant name:', tenant.name);
   *   console.log('Tenant plan:', tenant.plan);
   * }
   * ```
   */
  public getCurrentTenant(): PlatformTenant | null {
    return this.state.currentTenant;
  }

  /**
   * Get current tenant ID for API calls
   * @returns {string | null} The tenant ID or subdomain as fallback
   * @example
   * ```typescript
   * const tenantId = service.getCurrentTenantId();
   * // Use for API calls: `/api/tenants/${tenantId}/...`
   * ```
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
   * @returns {PlatformContextState} Complete state object
   * @deprecated Use getContext() instead for consistency
   */
  public getState(): PlatformContextState {
    return { ...this.state };
  }

  /**
   * Get real-time performance metrics and insights
   * @returns {object | null} Performance metrics object or null if monitoring disabled
   * @example
   * ```typescript
   * const metrics = service.getPerformanceMetrics();
   * if (metrics) {
   *   console.log('Cache hit ratio:', metrics.hitRatio);
   *   console.log('Avg response time:', metrics.averageResolutionTime);
   *   console.log('Performance score:', metrics.insights.score);
   * }
   * ```
   */
  public getPerformanceMetrics() {
    if (!this.config.monitoring.enabled) {
      return null;
    }
    
    return {
      ...this.performanceMonitor.getMetrics(),
      insights: this.performanceMonitor.getPerformanceInsights(),
      alerts: this.performanceMonitor.getAlerts(),
      circuitBreaker: { ...this.circuitBreaker },
      cacheInfo: {
        size: this.tenantCache.size,
        entries: Array.from(this.tenantCache.entries()).map(([subdomain, entry]) => ({
          subdomain,
          age: Date.now() - entry.timestamp,
          stale: this.isStale(entry),
          accessCount: entry.accessCount
        }))
      }
    };
  }

  /**
   * Get debug information (development only)
   */
  public getDebugInfo(): Record<string, any> | null {
    if (!this.config.monitoring.debugMode) {
      return null;
    }
    
    return {
      performance: this.performanceMonitor.getDebugInfo(),
      cache: {
        size: this.tenantCache.size,
        maxSize: this.config.cache.maxSize,
        entries: Array.from(this.tenantCache.entries())
      },
      circuitBreaker: this.circuitBreaker,
      config: this.config,
      state: this.state
    };
  }

  /**
   * Refresh tenant metadata (public method for React integration)
   */
  public async refreshTenantMetadata(subdomain: string): Promise<void> {
    return this.resolveTenantMetadata(subdomain, true);
  }

  /**
   * Enhanced tenant metadata resolution with caching and retry logic
   */
  private async resolveTenantMetadata(subdomain: string, forceRefresh: boolean = false): Promise<void> {
    this.log('debug', 'Resolving tenant metadata', { subdomain, forceRefresh });

    try {
      this.state.isLoading = true;
      this.state.error = null;

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = this.getCachedTenant(subdomain);
        if (cached) {
          this.state.currentTenant = cached.tenant;
          this.state.isLoading = false;

          // Check if data is stale and needs background refresh
          if (this.isStale(cached)) {
            this.scheduleBackgroundRefresh(subdomain);
          }

          this.performanceMonitor.recordCacheHit(subdomain, Date.now() - cached.timestamp);
          this.log('debug', 'Served from cache', { subdomain, stale: this.isStale(cached) });
          return;
        }
      }

      // Check circuit breaker
      if (!this.canMakeRequest()) {
        const error = TenantResolutionErrorFactory.apiUnavailable(subdomain, 1, 1);
        error.message = 'Service temporarily unavailable due to repeated failures';
        throw error;
      }

      // Fetch tenant with retry logic
      const startTime = Date.now();
      const tenant = await this.fetchTenantWithRetry(subdomain);
      const resolutionTime = Date.now() - startTime;
      
      if (tenant) {
        // Cache the result
        this.cacheTenant(subdomain, tenant);
        this.state.currentTenant = tenant;
        this.recordSuccessfulRequest();
        this.performanceMonitor.recordCacheMiss(subdomain, resolutionTime);
        
        this.log('debug', 'Tenant resolved successfully', { 
          subdomain, 
          resolutionTime,
          tenantId: tenant.id 
        });
      } else {
        const error = TenantResolutionErrorFactory.tenantNotFound(subdomain, 1, 1);
        this.performanceMonitor.recordResolutionError(subdomain);
        throw error;
      }

    } catch (error) {
      this.handleResolutionError(error as TenantResolutionError, subdomain);
      throw error;
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Fetch tenant with exponential backoff retry logic
   */
  private async fetchTenantWithRetry(subdomain: string): Promise<PlatformTenant | null> {
    let lastError: TenantResolutionError | null = null;

    for (let attempt = 1; attempt <= this.config.retry.maxAttempts; attempt++) {
      try {
        this.log('debug', 'Fetch attempt', { subdomain, attempt });
        
        const tenant = await this.fetchTenantBySubdomain(subdomain, attempt);
        
        // Reset circuit breaker on successful request
        this.recordSuccessfulRequest();
        
        return tenant;
        
      } catch (error) {
        lastError = error as TenantResolutionError;
        
        this.performanceMonitor.recordResolutionError(subdomain, attempt > 1);
        this.recordFailedRequest();
        
        // Don't retry for certain error types
        if (!lastError.retryable || attempt === this.config.retry.maxAttempts) {
          break;
        }
        
        // Wait before retry with exponential backoff
        const delay = lastError.getRetryDelay();
        this.log('debug', 'Retrying after delay', { 
          subdomain, 
          attempt, 
          delay, 
          errorType: lastError.type 
        });
        
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Fetch tenant metadata from platform API with timeout
   */
  private async fetchTenantBySubdomain(subdomain: string, attempt: number): Promise<PlatformTenant | null> {
    // Validate subdomain format
    if (!this.isValidSubdomain(subdomain)) {
      throw TenantResolutionErrorFactory.invalidSubdomain(subdomain);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.api.timeout);

    try {
      const response = await fetch(`/api/platform/tenants/by-subdomain/${subdomain}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw TenantResolutionErrorFactory.fromHttpResponse(
          response, 
          subdomain, 
          attempt, 
          this.config.retry.maxAttempts
        );
      }

      return await response.json();

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof TenantResolutionError) {
        throw error;
      }

      // Handle different error types
      if (error instanceof TypeError || (error as any)?.name === 'AbortError') {
        if ((error as any)?.name === 'AbortError') {
          throw TenantResolutionErrorFactory.timeout(subdomain, attempt, this.config.retry.maxAttempts);
        } else {
          throw TenantResolutionErrorFactory.networkError(subdomain, attempt, this.config.retry.maxAttempts, error as Error);
        }
      }

      // For development: create a mock tenant if API fails
      if (process.env.NODE_ENV === 'development' && this.config.monitoring.debugMode) {
        this.log('debug', 'Creating development mock tenant', { subdomain });
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
      
      throw TenantResolutionErrorFactory.networkError(subdomain, attempt, this.config.retry.maxAttempts, error as Error);
    }
  }

  /**
   * Schedule background refresh for stale data
   */
  private scheduleBackgroundRefresh(subdomain: string): void {
    // Avoid multiple concurrent refreshes for the same subdomain
    if (this.backgroundRefreshPromises.has(subdomain)) {
      return;
    }

    const refreshPromise = this.performBackgroundRefresh(subdomain);
    this.backgroundRefreshPromises.set(subdomain, refreshPromise);

    refreshPromise.finally(() => {
      this.backgroundRefreshPromises.delete(subdomain);
    });
  }

  /**
   * Perform background refresh without blocking current request
   */
  private async performBackgroundRefresh(subdomain: string): Promise<void> {
    try {
      this.log('debug', 'Starting background refresh', { subdomain });
      
      const startTime = Date.now();
      const tenant = await this.fetchTenantWithRetry(subdomain);
      const refreshTime = Date.now() - startTime;
      
      if (tenant) {
        this.cacheTenant(subdomain, tenant);
        
        // Update current tenant if it's the active one
        if (this.state.tenantSubdomain === subdomain) {
          this.state.currentTenant = tenant;
        }
        
        this.performanceMonitor.recordBackgroundRefresh(subdomain, refreshTime);
        this.log('debug', 'Background refresh completed', { subdomain, refreshTime });
      }
      
    } catch (error) {
      this.log('error', 'Background refresh failed', { 
        subdomain, 
        error: (error as Error).message 
      });
      // Don't throw - background refreshes should not break the application
    }
  }

  // Cache management methods

  /**
   * Get cached tenant with LRU access tracking
   */
  private getCachedTenant(subdomain: string): TenantCacheEntry | null {
    const cached = this.tenantCache.get(subdomain);
    if (!cached) {
      return null;
    }

    // Check if entry is too old
    if (this.isExpired(cached)) {
      this.tenantCache.delete(subdomain);
      this.performanceMonitor.recordEviction(subdomain);
      return null;
    }

    // Update LRU tracking
    cached.lastAccessed = Date.now();
    cached.accessCount++;

    return cached;
  }

  /**
   * Cache tenant with LRU eviction
   */
  private cacheTenant(subdomain: string, tenant: PlatformTenant): void {
    const entry: TenantCacheEntry = {
      tenant,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
    };

    // Evict entries if cache is full
    if (this.tenantCache.size >= this.config.cache.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    this.tenantCache.set(subdomain, entry);
    this.performanceMonitor.updateCacheSize(this.tenantCache.size, this.config.cache.maxSize);
    
    this.log('debug', 'Tenant cached', { subdomain, cacheSize: this.tenantCache.size });
  }

  /**
   * Evict least recently used cache entry
   */
  private evictLeastRecentlyUsed(): void {
    let oldestSubdomain = '';
    let oldestTime = Date.now();

    for (const [subdomain, entry] of this.tenantCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestSubdomain = subdomain;
      }
    }

    if (oldestSubdomain) {
      this.tenantCache.delete(oldestSubdomain);
      this.performanceMonitor.recordEviction(oldestSubdomain);
      this.log('debug', 'Evicted LRU entry', { subdomain: oldestSubdomain });
    }
  }

  /**
   * Check if cache entry is stale (serve but refresh in background)
   */
  private isStale(entry: TenantCacheEntry): boolean {
    return Date.now() - entry.timestamp > this.config.cache.staleThreshold;
  }

  /**
   * Check if cache entry is expired (remove from cache)
   */
  private isExpired(entry: TenantCacheEntry): boolean {
    return Date.now() - entry.timestamp > this.config.cache.maxAge;
  }

  // Circuit breaker methods

  /**
   * Check if we can make a request (circuit breaker)
   */
  private canMakeRequest(): boolean {
    const now = Date.now();

    switch (this.circuitBreaker.state) {
      case CircuitBreakerState.CLOSED:
        return true;
        
      case CircuitBreakerState.OPEN:
        if (now >= this.circuitBreaker.nextAttemptTime) {
          this.circuitBreaker.state = CircuitBreakerState.HALF_OPEN;
          this.log('debug', 'Circuit breaker half-open');
          return true;
        }
        return false;
        
      case CircuitBreakerState.HALF_OPEN:
        return true;
        
      default:
        return true;
    }
  }

  /**
   * Record successful request (circuit breaker)
   */
  private recordSuccessfulRequest(): void {
    if (this.circuitBreaker.state === CircuitBreakerState.HALF_OPEN) {
      this.circuitBreaker.state = CircuitBreakerState.CLOSED;
      this.circuitBreaker.failures = 0;
      this.log('debug', 'Circuit breaker closed');
    }
  }

  /**
   * Record failed request (circuit breaker)
   */
  private recordFailedRequest(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= this.config.circuitBreaker.errorThreshold) {
      this.circuitBreaker.state = CircuitBreakerState.OPEN;
      this.circuitBreaker.nextAttemptTime = Date.now() + this.config.circuitBreaker.resetTimeout;
      this.performanceMonitor.recordCircuitBreakerTrip();
      this.log('error', 'Circuit breaker opened', { 
        failures: this.circuitBreaker.failures 
      });
    }
  }

  // Utility methods

  /**
   * Handle resolution errors with proper state updates
   */
  private handleResolutionError(error: TenantResolutionError, subdomain: string): void {
    this.state.error = error;
    
    if (error.type === TenantResolutionErrorType.TENANT_NOT_FOUND) {
      this.state.currentTenant = null;
    }
    
    this.log('error', 'Tenant resolution failed', {
      subdomain,
      errorType: error.type,
      userMessage: error.userMessage,
      retryable: error.retryable
    });
  }

  /**
   * Validate subdomain format
   */
  private isValidSubdomain(subdomain: string): boolean {
    // Basic subdomain validation
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
    return subdomainRegex.test(subdomain) && subdomain.length >= 1 && subdomain.length <= 63;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logging utility with configurable levels
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.monitoring.enabled && level === 'debug') {
      return;
    }

    const logData = {
      service: 'PlatformContextService',
      level,
      message,
      timestamp: new Date().toISOString(),
      ...data
    };

    switch (level) {
      case 'debug':
        if (this.config.monitoring.debugMode) {
          console.debug('[PlatformContext]', logData);
        }
        break;
      case 'info':
        console.info('[PlatformContext]', logData);
        break;
      case 'warn':
        console.warn('[PlatformContext]', logData);
        break;
      case 'error':
        console.error('[PlatformContext]', logData);
        break;
    }
  }
}

// Export singleton instance
export const platformContextService = PlatformContextService.getInstance();

// Export convenience functions
export const getCurrentTenantId = () => platformContextService.getCurrentTenantId();
export const getCurrentTenant = () => platformContextService.getCurrentTenant();
export const getPlatformPerformanceMetrics = () => platformContextService.getPerformanceMetrics();
export const getPlatformDebugInfo = () => platformContextService.getDebugInfo(); 