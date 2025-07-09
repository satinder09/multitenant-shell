/**
 * ================================================================================================
 * UNIFIED ROUTE MANAGER SERVICE
 * ================================================================================================
 * 
 * Standardized route manager that handles platform vs tenant workflows with proper abstractions.
 * This service eliminates scattered redirect logic throughout the application.
 * 
 * Key Features:
 * - Centralized routing logic for platform vs tenant contexts
 * - Smart redirect strategies based on user roles and context
 * - Route protection and access control
 * - Navigation state management
 * - URL parameter handling and preservation
 * - Debug and logging capabilities
 * 
 * @author Multitenant Shell Team
 * @version 2.0.0
 * @since 2025-01-01
 */

import { 
  AuthUserProfile, 
  PlatformContext,
  RouteContext,
  RedirectConfig,
  AuthAccessLevel,
  AuthRole,
  AuthAccessType,
} from '../types/auth-unified.types';

import { 
  AUTH_CONFIG,
  AUTH_ROUTES,
  AUTH_VALIDATORS,
  AUTH_DEBUG,
  AUTH_TIMEOUTS,
} from '../config/auth.config';

/**
 * ================================================================================================
 * ROUTE MANAGER CLASS
 * ================================================================================================
 */
export class RouteManagerService {
  private static instance: RouteManagerService;
  
  /** Navigation history for smart back navigation */
  private navigationHistory: string[] = [];
  
  /** Pending redirects queue */
  private pendingRedirects: RedirectConfig[] = [];
  
  /** Route change listeners */
  private routeChangeListeners: ((context: RouteContext) => void)[] = [];

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.initializeRouteTracking();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RouteManagerService {
    if (!RouteManagerService.instance) {
      RouteManagerService.instance = new RouteManagerService();
    }
    return RouteManagerService.instance;
  }

  /**
   * ================================================================================================
   * ROUTE ANALYSIS AND CONTEXT
   * ================================================================================================
   */

  /**
   * Analyze current route and provide context
   */
  public analyzeRoute(pathname?: string, hostname?: string): RouteContext {
    const currentPathname = pathname || (typeof window !== 'undefined' ? window.location.pathname : '/');
    const currentHostname = hostname || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
    
    const context: RouteContext = {
      pathname: currentPathname,
      hostname: currentHostname,
      isPublic: AUTH_VALIDATORS.isPublicRoute(currentPathname),
      isPlatformRoute: AUTH_VALIDATORS.isPlatformRoute(currentPathname, currentHostname),
      isTenantRoute: AUTH_VALIDATORS.isTenantRoute(currentPathname, currentHostname),
      requiredAccessLevel: this.getRequiredAccessLevel(currentPathname),
    };
    
    this.log('debug', 'Route analyzed', context);
    
    return context;
  }

  /**
   * Get platform context from hostname
   */
  public getPlatformContextFromHostname(hostname: string): PlatformContext {
    const isPlatform = AUTH_VALIDATORS.isPlatformHost(hostname);
    const tenantSubdomain = AUTH_VALIDATORS.getTenantSubdomain(hostname);
    
    return {
      isPlatform,
      tenantSubdomain,
      baseDomain: AUTH_CONFIG.DOMAINS.BASE_DOMAIN,
      currentTenant: null,
      tenantId: null,
    };
  }

  /**
   * Check if user has access to a specific route
   */
  public hasRouteAccess(
    user: AuthUserProfile | null,
    platform: PlatformContext,
    routeContext: RouteContext
  ): boolean {
    // Public routes are always accessible
    if (routeContext.isPublic) {
      return true;
    }
    
    // Must be authenticated for protected routes
    if (!user) {
      return false;
    }
    
    // Platform route access rules
    if (routeContext.isPlatformRoute) {
      // Must be on platform domain
      if (!platform.isPlatform) {
        return false;
      }
      
      // Must have platform access (super admin or platform admin)
      if (!user.isSuperAdmin && user.role !== 'platform_admin') {
        return false;
      }
    }
    
    // Tenant route access rules
    if (routeContext.isTenantRoute) {
      // Must be on tenant domain
      if (platform.isPlatform) {
        return false;
      }
      
      // Must have tenant access
      if (!user.tenantId && !user.isSuperAdmin) {
        return false;
      }
    }
    
    // Check specific access level requirements
    if (routeContext.requiredAccessLevel) {
      if (!this.hasAccessLevel(user, routeContext.requiredAccessLevel)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * ================================================================================================
   * SMART NAVIGATION AND REDIRECTS
   * ================================================================================================
   */

  /**
   * Get the ideal landing page for a user after login
   */
  public getPostLoginRoute(
    user: AuthUserProfile,
    platform: PlatformContext,
    redirectUrl?: string
  ): string {
    // Use explicit redirect URL if provided and valid
    if (redirectUrl && this.isValidRedirectUrl(redirectUrl)) {
      this.log('debug', 'Using explicit redirect URL', { redirectUrl });
      return redirectUrl;
    }
    
    // Super admin logic
    if (user.isSuperAdmin) {
      // Super admin on platform domain - go to platform dashboard
      if (platform.isPlatform) {
        return AUTH_ROUTES.PLATFORM.HOME;
      }
      
      // Super admin on tenant domain - they can access both, but prefer platform
      if (platform.tenantSubdomain) {
        // If they have tenant context, go to tenant dashboard
        if (user.tenantId) {
          return AUTH_ROUTES.TENANT.HOME;
        }
        // Otherwise redirect to platform
        return this.buildPlatformUrl(AUTH_ROUTES.PLATFORM.HOME);
      }
    }
    
    // Platform admin logic
    if (user.role === 'platform_admin') {
      // Platform admin should always go to platform
      if (platform.isPlatform) {
        return AUTH_ROUTES.PLATFORM.HOME;
      } else {
        return this.buildPlatformUrl(AUTH_ROUTES.PLATFORM.HOME);
      }
    }
    
    // Tenant user logic
    if (user.tenantId) {
      // Tenant user on correct tenant domain
      if (platform.tenantSubdomain && platform.tenantId === user.tenantId) {
        return AUTH_ROUTES.TENANT.HOME;
      }
      
      // Tenant user on wrong domain - redirect to their tenant
      return this.buildTenantUrl(user.tenantId, AUTH_ROUTES.TENANT.HOME);
    }
    
    // Default fallback
    if (platform.isPlatform) {
      return AUTH_ROUTES.PLATFORM.HOME;
    } else {
      return AUTH_ROUTES.TENANT.HOME;
    }
  }

  /**
   * Get the appropriate login URL for current context
   */
  public getLoginRoute(
    platform: PlatformContext,
    currentPath?: string,
    secureToken?: string
  ): string {
    const loginUrl = new URL(AUTH_ROUTES.PUBLIC.LOGIN, this.getCurrentBaseUrl());
    
    // Preserve current path as redirect parameter
    if (currentPath && currentPath !== AUTH_ROUTES.PUBLIC.LOGIN) {
      loginUrl.searchParams.set('redirect', currentPath);
    }
    
    // Add secure login token if provided
    if (secureToken) {
      loginUrl.searchParams.set('secureLoginToken', secureToken);
    }
    
    return loginUrl.toString();
  }

  /**
   * Handle logout redirect
   */
  public getLogoutRoute(platform: PlatformContext): string {
    // Always redirect to login on the same domain
    return AUTH_ROUTES.PUBLIC.LOGIN;
  }

  /**
   * Handle unauthorized access redirect
   */
  public getUnauthorizedRoute(
    user: AuthUserProfile | null,
    platform: PlatformContext,
    attemptedRoute: string
  ): string {
    // Not authenticated - go to login
    if (!user) {
      return this.getLoginRoute(platform, attemptedRoute);
    }
    
    // Authenticated but wrong domain/context
    const correctRoute = this.getPostLoginRoute(user, platform);
    this.log('info', 'Redirecting unauthorized user to correct route', {
      userId: user.id,
      attemptedRoute,
      correctRoute,
    });
    
    return correctRoute;
  }

  /**
   * Execute redirect with proper delay and logging
   */
  public async executeRedirect(
    config: RedirectConfig,
    router?: { push: (url: string) => void; replace: (url: string) => void }
  ): Promise<void> {
    const { url, replace = false, delay = AUTH_TIMEOUTS.REDIRECT_DELAY, reason } = config;
    
    this.log('info', 'Executing redirect', { url, replace, delay, reason });
    
    // Add to navigation history
    if (typeof window !== 'undefined') {
      this.navigationHistory.push(window.location.pathname);
    }
    
    // Execute redirect after delay
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    if (router) {
      // Use Next.js router
      if (replace) {
        router.replace(url);
      } else {
        router.push(url);
      }
    } else {
      // Use native navigation
      if (replace) {
        window.location.replace(url);
      } else {
        window.location.href = url;
      }
    }
  }

  /**
   * ================================================================================================
   * URL BUILDING AND UTILITIES
   * ================================================================================================
   */

  /**
   * Build platform URL
   */
  public buildPlatformUrl(path: string): string {
    const baseUrl = `${window.location.protocol}//${AUTH_CONFIG.DOMAINS.BASE_DOMAIN}:${AUTH_CONFIG.DOMAINS.FRONTEND_PORT}`;
    return `${baseUrl}${path}`;
  }

  /**
   * Build tenant URL
   */
  public buildTenantUrl(tenantId: string, path: string): string {
    // In a real app, you'd look up the tenant subdomain by ID
    // For now, we'll assume tenantId is the subdomain
    const baseUrl = `${window.location.protocol}//${tenantId}.${AUTH_CONFIG.DOMAINS.BASE_DOMAIN}:${AUTH_CONFIG.DOMAINS.FRONTEND_PORT}`;
    return `${baseUrl}${path}`;
  }

  /**
   * Get current base URL
   */
  public getCurrentBaseUrl(): string {
    if (typeof window === 'undefined') {
      return `http://${AUTH_CONFIG.DOMAINS.BASE_DOMAIN}:${AUTH_CONFIG.DOMAINS.FRONTEND_PORT}`;
    }
    
    return `${window.location.protocol}//${window.location.host}`;
  }

  /**
   * Parse and validate redirect URL
   */
  public isValidRedirectUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url, this.getCurrentBaseUrl());
      
      // Must be same origin or allowed domain
      const allowedHosts = [
        AUTH_CONFIG.DOMAINS.BASE_DOMAIN,
        `${AUTH_CONFIG.DOMAINS.BASE_DOMAIN}:${AUTH_CONFIG.DOMAINS.FRONTEND_PORT}`,
        ...AUTH_CONFIG.DOMAINS.PLATFORM_HOSTS,
      ];
      
      const isAllowedHost = allowedHosts.some(host => 
        parsedUrl.hostname === host || 
        parsedUrl.hostname.endsWith(`.${host}`)
      );
      
      if (!isAllowedHost) {
        this.log('warn', 'Invalid redirect URL - not allowed host', { url, hostname: parsedUrl.hostname });
        return false;
      }
      
      // Must not be a login page (prevent loops)
      if (parsedUrl.pathname === AUTH_ROUTES.PUBLIC.LOGIN) {
        this.log('warn', 'Invalid redirect URL - login page', { url });
        return false;
      }
      
      return true;
    } catch (error) {
      this.log('warn', 'Invalid redirect URL - parse error', { url, error: (error as Error).message });
      return false;
    }
  }

  /**
   * ================================================================================================
   * ROUTE PROTECTION AND ACCESS CONTROL
   * ================================================================================================
   */

  /**
   * Get required access level for a route
   */
  private getRequiredAccessLevel(pathname: string): AuthAccessLevel | undefined {
    // Admin routes require admin access
    if (pathname.includes('/admin')) {
      return 'tenant_admin';
    }
    
    // Platform routes require platform access
    if (pathname.startsWith('/platform')) {
      return 'platform_admin';
    }
    
    // No specific requirements
    return undefined;
  }

  /**
   * Check if user has specific access level
   */
  private hasAccessLevel(user: AuthUserProfile, requiredLevel: AuthAccessLevel): boolean {
    // Super admin has all access
    if (user.isSuperAdmin) {
      return true;
    }
    
    // Check role-based access
    if (user.role === requiredLevel) {
      return true;
    }
    
    // Check access type
    if (user.accessType === requiredLevel) {
      return true;
    }
    
    // Admin levels
    const adminLevels = ['super_admin', 'platform_admin', 'tenant_admin'];
    const userAdminLevel = adminLevels.indexOf(user.role || '');
    const requiredAdminLevel = adminLevels.indexOf(requiredLevel);
    
    if (userAdminLevel !== -1 && requiredAdminLevel !== -1) {
      return userAdminLevel <= requiredAdminLevel;
    }
    
    return false;
  }

  /**
   * ================================================================================================
   * NAVIGATION HISTORY AND STATE
   * ================================================================================================
   */

  /**
   * Add route change listener
   */
  public addRouteChangeListener(listener: (context: RouteContext) => void): void {
    this.routeChangeListeners.push(listener);
  }

  /**
   * Remove route change listener
   */
  public removeRouteChangeListener(listener: (context: RouteContext) => void): void {
    const index = this.routeChangeListeners.indexOf(listener);
    if (index > -1) {
      this.routeChangeListeners.splice(index, 1);
    }
  }

  /**
   * Get navigation history
   */
  public getNavigationHistory(): string[] {
    return [...this.navigationHistory];
  }

  /**
   * Get smart back URL
   */
  public getSmartBackUrl(): string {
    if (this.navigationHistory.length === 0) {
      return '/';
    }
    
    // Get the last different page
    const current = typeof window !== 'undefined' ? window.location.pathname : '/';
    for (let i = this.navigationHistory.length - 1; i >= 0; i--) {
      if (this.navigationHistory[i] !== current) {
        return this.navigationHistory[i];
      }
    }
    
    return '/';
  }

  /**
   * ================================================================================================
   * PRIVATE HELPER METHODS
   * ================================================================================================
   */

  /**
   * Initialize route tracking
   */
  private initializeRouteTracking(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    // Track initial route
    this.navigationHistory.push(window.location.pathname);
    
    // Track route changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.onRouteChange();
    };
    
    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.onRouteChange();
    };
    
    // Track popstate (back/forward)
    window.addEventListener('popstate', () => {
      this.onRouteChange();
    });
  }

  /**
   * Handle route change
   */
  private onRouteChange(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    const currentPath = window.location.pathname;
    const context = this.analyzeRoute(currentPath);
    
    // Add to history
    const lastPath = this.navigationHistory[this.navigationHistory.length - 1];
    if (lastPath !== currentPath) {
      this.navigationHistory.push(currentPath);
      
      // Keep history size reasonable
      if (this.navigationHistory.length > 50) {
        this.navigationHistory.shift();
      }
    }
    
    // Notify listeners
    this.routeChangeListeners.forEach(listener => {
      try {
        listener(context);
      } catch (error) {
        this.log('error', 'Route change listener error', { error: (error as Error).message });
      }
    });
  }

  /**
   * Logging with debug support
   */
  private log(level: string, message: string, data?: any): void {
    if (!AUTH_DEBUG.ENABLED) {
      return;
    }
    
    const logData = {
      service: 'RouteManagerService',
      level,
      message,
      timestamp: new Date().toISOString(),
      ...data,
    };
    
    switch (level) {
      case 'error':
        console.error(`[RouteManager] ${message}`, logData);
        break;
      case 'warn':
        console.warn(`[RouteManager] ${message}`, logData);
        break;
      case 'info':
        console.info(`[RouteManager] ${message}`, logData);
        break;
      case 'debug':
        if (AUTH_DEBUG.DEBUG_AUTH) {
          console.log(`[RouteManager] ${message}`, logData);
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
export const routeManager = RouteManagerService.getInstance();

// Export class for testing
export default RouteManagerService; 