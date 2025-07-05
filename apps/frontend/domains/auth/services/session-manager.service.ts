/**
 * ================================================================================================
 * UNIFIED SESSION MANAGER SERVICE
 * ================================================================================================
 * 
 * Optimized session manager that handles unified caching, token management, and API optimization.
 * This service minimizes redundant API calls and provides efficient session management.
 * 
 * Key Features:
 * - Unified user and platform data caching
 * - Smart cache invalidation and refresh strategies
 * - CSRF token management with automatic refresh
 * - API request optimization and deduplication
 * - Session state persistence across page reloads
 * - Performance monitoring and debug capabilities
 * 
 * @author Multitenant Shell Team
 * @version 2.0.0
 * @since 2025-01-01
 */

import { 
  AuthUserProfile, 
  PlatformTenant, 
  PlatformContext,
  AuthSession,
  CacheEntry,
  AuthApiError,
  RequestConfig,
  DebugInfo,
  AuthEvent,
  AuthEventListener,
  LoginCredentials,
  LoginResponse,
} from '../types/auth-unified.types';

import { 
  AUTH_CONFIG,
  AUTH_ENDPOINTS,
  AUTH_TIMEOUTS,
  AUTH_STORAGE,
  AUTH_DEBUG,
  AUTH_VALIDATORS,
} from '../config/auth.config';

import { browserApi } from '@/shared/services/api-client';

/**
 * ================================================================================================
 * SESSION MANAGER CLASS
 * ================================================================================================
 */
export class SessionManagerService {
  private static instance: SessionManagerService;
  
  /** In-memory cache for user and platform data */
  private cache = new Map<string, CacheEntry<any>>();
  
  /** CSRF token state */
  private csrfToken: string | null = null;
  private csrfTokenExpiry: number = 0;
  
  /** API call deduplication */
  private pendingRequests = new Map<string, Promise<any>>();
  
  /** Event listeners for auth events */
  private eventListeners = new Map<string, AuthEventListener[]>();
  
  /** Performance metrics */
  private metrics = {
    apiCallCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    lastLoginDuration: 0,
    lastRefreshDuration: 0,
  };
  
  /** Current session state */
  private currentSession: AuthSession = {
    user: null,
    isAuthenticated: false,
    isSuperAdmin: false,
    tenantId: null,
    isTemporary: false,
  };
  
  /** Current platform context */
  private currentPlatform: PlatformContext = {
    isPlatform: true,
    tenantSubdomain: null,
    baseDomain: AUTH_CONFIG.DOMAINS.BASE_DOMAIN,
    currentTenant: null,
    tenantId: null,
  };

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.initializePlatformContext();
    this.setupCacheCleanup();
    this.restoreFromStorage();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SessionManagerService {
    if (!SessionManagerService.instance) {
      SessionManagerService.instance = new SessionManagerService();
    }
    return SessionManagerService.instance;
  }

  /**
   * ================================================================================================
   * PUBLIC API METHODS
   * ================================================================================================
   */

  /**
   * Get current authentication session
   */
  public getSession(): AuthSession {
    return { ...this.currentSession };
  }

  /**
   * Get current platform context
   */
  public getPlatformContext(): PlatformContext {
    return { ...this.currentPlatform };
  }

  /**
   * Authenticate user with credentials
   */
  public async login(credentials: LoginCredentials, redirectUrl?: string): Promise<LoginResponse> {
    const startTime = Date.now();
    
    try {
      this.log('info', 'Starting login process', { email: credentials.email });
      
      // Clear any existing session
      this.clearSession();
      
      // Perform login API call
      const response = await this.makeApiCall<LoginResponse>(
        AUTH_ENDPOINTS.LOGIN,
        {
          method: 'POST',
          body: JSON.stringify(credentials),
          timeout: AUTH_TIMEOUTS.LOGIN_TIMEOUT,
        }
      );
      
      if (response.success && response.user) {
        // Update session state
        this.updateSession(response.user);
        
        // Cache user data
        this.setCacheEntry('user_profile', response.user, AUTH_TIMEOUTS.CACHE_STALE_TIME);
        
        // Persist to storage
        this.persistToStorage();
        
        // Emit login event
        this.emitEvent('login', { user: response.user, redirectUrl });
        
        this.log('info', 'Login successful', { userId: response.user.id });
        
        return response;
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      this.log('error', 'Login failed', { error: (error as Error).message });
      this.emitEvent('error', { type: 'login', error });
      throw this.wrapError(error, 'LOGIN_FAILED');
    } finally {
      this.metrics.lastLoginDuration = Date.now() - startTime;
    }
  }

  /**
   * Logout current user
   */
  public async logout(): Promise<void> {
    try {
      this.log('info', 'Starting logout process');
      
      // Call logout API
      await this.makeApiCall(AUTH_ENDPOINTS.LOGOUT, { method: 'POST' });
      
      // Clear session and cache
      this.clearSession();
      
      // Emit logout event
      this.emitEvent('logout', {});
      
      this.log('info', 'Logout successful');
    } catch (error) {
      this.log('error', 'Logout failed', { error: (error as Error).message });
      // Still clear session even if API call fails
      this.clearSession();
    }
  }

  /**
   * Refresh user profile data
   */
  public async refreshUser(forceRefresh = false): Promise<AuthUserProfile | null> {
    const cacheKey = 'user_profile';
    const startTime = Date.now();
    
    try {
      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cached = this.getCacheEntry<AuthUserProfile>(cacheKey);
        if (cached) {
          this.metrics.cacheHits++;
          this.log('debug', 'Using cached user profile');
          return cached;
        }
      }
      
      this.metrics.cacheMisses++;
      this.log('debug', 'Fetching fresh user profile');
      
      // Deduplicate concurrent requests
      const requestKey = 'refresh_user';
      if (this.pendingRequests.has(requestKey)) {
        return this.pendingRequests.get(requestKey);
      }
      
      const request = this.makeApiCall<AuthUserProfile>(AUTH_ENDPOINTS.ME, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      
      this.pendingRequests.set(requestKey, request);
      
      try {
        const user = await request;
        
        if (user) {
          // Update session
          this.updateSession(user);
          
          // Cache the result
          this.setCacheEntry(cacheKey, user, AUTH_TIMEOUTS.CACHE_STALE_TIME);
          
          // Persist to storage
          this.persistToStorage();
          
          // Emit user updated event
          this.emitEvent('user_updated', { user });
          
          this.log('debug', 'User profile refreshed', { userId: user.id });
        } else {
          // User not authenticated
          this.clearSession();
        }
        
        return user;
      } finally {
        this.pendingRequests.delete(requestKey);
      }
    } catch (error) {
      const authError = error as AuthApiError;
      
      // Handle 401 as expected (not an error)
      if (authError.status === 401) {
        this.log('debug', 'User not authenticated (401)');
        this.clearSession();
        return null;
      }
      
      this.log('error', 'Failed to refresh user profile', { error: authError.message });
      throw this.wrapError(error, 'REFRESH_USER_FAILED');
    } finally {
      this.metrics.lastRefreshDuration = Date.now() - startTime;
    }
  }

  /**
   * Refresh tenant data for current subdomain
   */
  public async refreshTenant(): Promise<PlatformTenant | null> {
    const subdomain = this.currentPlatform.tenantSubdomain;
    
    if (!subdomain) {
      this.log('debug', 'No subdomain to refresh tenant for');
      return null;
    }
    
    const cacheKey = `tenant_${subdomain}`;
    
    try {
      // Check cache first
      const cached = this.getCacheEntry<PlatformTenant>(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        this.log('debug', 'Using cached tenant data', { subdomain });
        this.updatePlatformContext({ currentTenant: cached, tenantId: cached.id });
        return cached;
      }
      
      this.metrics.cacheMisses++;
      this.log('debug', 'Fetching fresh tenant data', { subdomain });
      
      // Deduplicate concurrent requests
      const requestKey = `refresh_tenant_${subdomain}`;
      if (this.pendingRequests.has(requestKey)) {
        return this.pendingRequests.get(requestKey);
      }
      
      const request = this.makeApiCall<PlatformTenant>(
        AUTH_CONFIG.PLATFORM_ENDPOINTS.TENANT_BY_SUBDOMAIN(subdomain)
      );
      
      this.pendingRequests.set(requestKey, request);
      
      try {
        const tenant = await request;
        
        if (tenant) {
          // Update platform context
          this.updatePlatformContext({ currentTenant: tenant, tenantId: tenant.id });
          
          // Cache the result
          this.setCacheEntry(cacheKey, tenant, AUTH_TIMEOUTS.CACHE_STALE_TIME);
          
          this.log('debug', 'Tenant data refreshed', { tenantId: tenant.id, subdomain });
        }
        
        return tenant;
      } finally {
        this.pendingRequests.delete(requestKey);
      }
    } catch (error) {
      this.log('error', 'Failed to refresh tenant data', { 
        subdomain, 
        error: (error as Error).message 
      });
      throw this.wrapError(error, 'REFRESH_TENANT_FAILED');
    }
  }

  /**
   * Check if current session is valid
   */
  public isSessionValid(): boolean {
    if (!this.currentSession.isAuthenticated || !this.currentSession.user) {
      return false;
    }
    
    // Check if session is temporary and expired
    if (this.currentSession.isTemporary && this.currentSession.user.expiresAt) {
      const expirationTime = new Date(this.currentSession.user.expiresAt);
      const now = new Date();
      
      if (now > expirationTime) {
        this.log('info', 'Temporary session expired');
        this.emitEvent('session_expired', { user: this.currentSession.user });
        this.clearSession();
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get remaining session time in milliseconds
   */
  public getSessionTimeRemaining(): number {
    if (!this.isSessionValid() || !this.currentSession.user?.expiresAt) {
      return 0;
    }
    
    const expirationTime = new Date(this.currentSession.user.expiresAt);
    const now = new Date();
    
    return Math.max(0, expirationTime.getTime() - now.getTime());
  }

  /**
   * Clear current session and cache
   */
  public clearSession(): void {
    this.log('debug', 'Clearing session and cache');
    
    // Reset session state
    this.currentSession = {
      user: null,
      isAuthenticated: false,
      isSuperAdmin: false,
      tenantId: null,
      isTemporary: false,
    };
    
    // Clear cache
    this.cache.clear();
    
    // Clear CSRF token
    this.csrfToken = null;
    this.csrfTokenExpiry = 0;
    
    // Clear storage
    this.clearStorage();
    
    // Clear pending requests
    this.pendingRequests.clear();
    
    // Emit cache cleared event
    this.emitEvent('cache_cleared', {});
  }

  /**
   * ================================================================================================
   * CSRF TOKEN MANAGEMENT
   * ================================================================================================
   */

  /**
   * Get valid CSRF token
   */
  public async getCsrfToken(): Promise<string> {
    // Check if current token is still valid
    if (this.csrfToken && Date.now() < this.csrfTokenExpiry) {
      this.log('debug', 'Using cached CSRF token');
      return this.csrfToken;
    }
    
    this.log('debug', 'Refreshing CSRF token');
    
    try {
      const response = await fetch(AUTH_ENDPOINTS.CSRF_TOKEN, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }
      
      const token = response.headers.get('X-CSRF-Token');
      if (!token) {
        throw new Error('No CSRF token in response');
      }
      
      this.csrfToken = token;
      this.csrfTokenExpiry = Date.now() + AUTH_TIMEOUTS.CSRF_TOKEN_DURATION;
      
      this.log('debug', 'CSRF token refreshed successfully');
      
      return token;
    } catch (error) {
      this.log('error', 'Failed to refresh CSRF token', { error: (error as Error).message });
      throw this.wrapError(error, 'CSRF_TOKEN_FAILED');
    }
  }

  /**
   * ================================================================================================
   * EVENT SYSTEM
   * ================================================================================================
   */

  /**
   * Add event listener
   */
  public addEventListener(eventType: string, listener: AuthEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(eventType: string, listener: AuthEventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): DebugInfo {
    return {
      authState: {
        session: this.currentSession,
        platform: this.currentPlatform,
      },
      performance: {
        lastLoginDuration: this.metrics.lastLoginDuration,
        lastRefreshDuration: this.metrics.lastRefreshDuration,
        apiCallCount: this.metrics.apiCallCount,
      },
      cache: {
        hitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
        size: this.cache.size,
        oldestEntry: this.getOldestCacheEntry(),
      },
    };
  }

  /**
   * ================================================================================================
   * PRIVATE HELPER METHODS
   * ================================================================================================
   */

  /**
   * Initialize platform context based on current hostname
   */
  private initializePlatformContext(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    const hostname = window.location.hostname;
    const isPlatform = AUTH_VALIDATORS.isPlatformHost(hostname);
    const tenantSubdomain = AUTH_VALIDATORS.getTenantSubdomain(hostname);
    
    this.updatePlatformContext({
      isPlatform,
      tenantSubdomain,
      currentTenant: null,
      tenantId: null,
    });
    
    this.log('debug', 'Platform context initialized', {
      hostname,
      isPlatform,
      tenantSubdomain,
    });
  }

  /**
   * Update session state
   */
  private updateSession(user: AuthUserProfile): void {
    const isTemporary = user.accessType === 'secure_login' || user.accessType === 'impersonation';
    
    this.currentSession = {
      user,
      isAuthenticated: true,
      isSuperAdmin: !!user.isSuperAdmin,
      tenantId: user.tenantId || null,
      sessionCreatedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      isTemporary,
    };
  }

  /**
   * Update platform context
   */
  private updatePlatformContext(updates: Partial<PlatformContext>): void {
    this.currentPlatform = {
      ...this.currentPlatform,
      ...updates,
    };
  }

  /**
   * Make optimized API call with caching and error handling
   */
  private async makeApiCall<T>(
    endpoint: string,
    config: RequestConfig & { method?: string; body?: string } = {}
  ): Promise<T> {
    this.metrics.apiCallCount++;
    
    const {
      method = 'GET',
      body,
      timeout = AUTH_TIMEOUTS.API_TIMEOUT,
      headers = {},
      ...otherConfig
    } = config;
    
    try {
      // Add CSRF token for state-changing requests
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
        const csrfToken = await this.getCsrfToken();
        headers['X-CSRF-Token'] = csrfToken;
      }
      
      const response = await browserApi.request({
        url: endpoint,
        method: method as any,
        data: body ? JSON.parse(body) : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        timeout: timeout,
        ...otherConfig,
      });
      
      if (response.success) {
        return response.data as T;
      } else {
        throw new Error(response.message || 'API call failed');
      }
    } catch (error) {
      throw this.wrapError(error, 'API_CALL_FAILED');
    }
  }

  /**
   * Cache management methods
   */
  private setCacheEntry<T>(key: string, data: T, ttl: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      key,
    };
    
    this.cache.set(key, entry);
    this.log('debug', 'Cache entry set', { key, ttl });
  }

  private getCacheEntry<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.log('debug', 'Cache entry expired', { key });
      return null;
    }
    
    return entry.data;
  }

  private getOldestCacheEntry(): number | undefined {
    let oldest: number | undefined;
    
    for (const entry of this.cache.values()) {
      if (!oldest || entry.timestamp < oldest) {
        oldest = entry.timestamp;
      }
    }
    
    return oldest;
  }

  /**
   * Setup automatic cache cleanup
   */
  private setupCacheCleanup(): void {
    // Clean up expired cache entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        this.log('debug', 'Cache cleanup completed', { cleanedEntries: cleaned });
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Storage persistence methods
   */
  private persistToStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    
    try {
      const data = {
        session: this.currentSession,
        platform: this.currentPlatform,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(AUTH_STORAGE.LOCAL_STORAGE.USER_CACHE, JSON.stringify(data));
      this.log('debug', 'Session persisted to storage');
    } catch (error) {
      this.log('warn', 'Failed to persist session to storage', { error: (error as Error).message });
    }
  }

  private restoreFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    
    try {
      const stored = localStorage.getItem(AUTH_STORAGE.LOCAL_STORAGE.USER_CACHE);
      if (!stored) {
        return;
      }
      
      const data = JSON.parse(stored);
      
      // Check if data is stale (older than cache stale time)
      if (Date.now() - data.timestamp > AUTH_TIMEOUTS.CACHE_STALE_TIME) {
        this.log('debug', 'Stored session data is stale, clearing');
        this.clearStorage();
        return;
      }
      
      this.currentSession = data.session || this.currentSession;
      this.currentPlatform = data.platform || this.currentPlatform;
      
      this.log('debug', 'Session restored from storage');
    } catch (error) {
      this.log('warn', 'Failed to restore session from storage', { error: (error as Error).message });
      this.clearStorage();
    }
  }

  private clearStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    
    try {
      localStorage.removeItem(AUTH_STORAGE.LOCAL_STORAGE.USER_CACHE);
      localStorage.removeItem(AUTH_STORAGE.LOCAL_STORAGE.PLATFORM_CACHE);
      this.log('debug', 'Storage cleared');
    } catch (error) {
      this.log('warn', 'Failed to clear storage', { error: (error as Error).message });
    }
  }

  /**
   * Event emission
   */
  private emitEvent(type: string, data: any): void {
    const event: AuthEvent = {
      type: type as any,
      timestamp: Date.now(),
      data,
      metadata: {
        source: 'SessionManagerService',
        userId: this.currentSession.user?.id,
        tenantId: this.currentSession.tenantId || undefined,
      },
    };
    
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          this.log('error', 'Event listener error', { type, error: (error as Error).message });
        }
      });
    }
  }

  /**
   * Error wrapping
   */
  private wrapError(error: any, code: string): AuthApiError {
    const authError = error as AuthApiError;
    authError.code = code;
    return authError;
  }

  /**
   * Logging with debug support
   */
  private log(level: string, message: string, data?: any): void {
    if (!AUTH_DEBUG.ENABLED) {
      return;
    }
    
    const logData = {
      service: 'SessionManagerService',
      level,
      message,
      timestamp: new Date().toISOString(),
      ...data,
    };
    
    switch (level) {
      case 'error':
        console.error(`[SessionManager] ${message}`, logData);
        break;
      case 'warn':
        console.warn(`[SessionManager] ${message}`, logData);
        break;
      case 'info':
        console.info(`[SessionManager] ${message}`, logData);
        break;
      case 'debug':
        if (AUTH_DEBUG.DEBUG_AUTH) {
          console.log(`[SessionManager] ${message}`, logData);
        }
        break;
    }
  }
}

/**
 * ================================================================================================
 * SINGLETON EXPORT
 * ================================================================================================
 */

// Export singleton instance
export const sessionManager = SessionManagerService.getInstance();

// Export class for testing
export default SessionManagerService; 