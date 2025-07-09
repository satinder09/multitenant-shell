/**
 * ================================================================================================
 * AUTHENTICATION CONFIGURATION
 * ================================================================================================
 * 
 * Centralized configuration for all authentication-related constants, routes, timeouts,
 * and settings. This eliminates magic constants and hard-coded values throughout the application.
 * 
 * @author Multitenant Shell Team
 * @version 2.0.0
 * @since 2025-01-01
 */

/**
 * Authentication API endpoints configuration
 */
export const AUTH_ENDPOINTS = {
  /** User authentication endpoints */
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  REFRESH: '/api/auth/refresh',
  ME: '/api/auth/me',
  
  /** CSRF protection endpoints */
  CSRF_TOKEN: '/api/auth/csrf-token',
  
  /** Password management endpoints */
  CHANGE_PASSWORD: '/api/auth/change-password',
  REQUEST_PASSWORD_RESET: '/api/auth/request-password-reset',
  RESET_PASSWORD: '/api/auth/reset-password',
  
  /** Session management endpoints */
  SESSIONS: '/api/auth/sessions',
  CLEAR_SESSION: '/api/auth/clear-session',
  
  /** Secure access endpoints */
  SECURE_LOGIN: '/api/auth/secure-login',
  IMPERSONATION_END: '/api/auth/impersonation/end',
} as const;

/**
 * Platform and tenant API endpoints configuration
 */
export const PLATFORM_ENDPOINTS = {
  /** Tenant resolution endpoints */
  TENANT_BY_SUBDOMAIN: (subdomain: string) => `/api/platform/tenants/by-subdomain/${subdomain}`,
  
  /** Platform management endpoints */
  TENANTS: '/api/tenants',
  PLATFORM_USERS: '/api/platform/admin/users',
} as const;

/**
 * Application route paths configuration
 */
export const AUTH_ROUTES = {
  /** Public routes (no authentication required) */
  PUBLIC: {
    LOGIN: '/login',
    SIGNUP: '/signup',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
  },
  
  /** Protected routes for platform users */
  PLATFORM: {
    HOME: '/platform',
    ADMIN: '/platform/admin',
    TENANTS: '/platform/tenants',
    USERS: '/platform/users',
    ROLES: '/platform/admin/roles',
    PERMISSIONS: '/platform/admin/permissions',
  },
  
  /** Protected routes for tenant users */
  TENANT: {
    HOME: '/',
    ADMIN: '/admin',
    USERS: '/admin/users',
    ROLES: '/admin/roles',
  },
} as const;

/**
 * Authentication timing configuration (in milliseconds)
 */
export const AUTH_TIMEOUTS = {
  /** Session and token timeouts */
  SESSION_DURATION: 8 * 60 * 60 * 1000,        // 8 hours
  CSRF_TOKEN_DURATION: 30 * 60 * 1000,         // 30 minutes
  CSRF_REFRESH_INTERVAL: 25 * 60 * 1000,       // 25 minutes (refresh before expiry)
  
  /** API request timeouts */
  LOGIN_TIMEOUT: 30 * 1000,                    // 30 seconds
  API_TIMEOUT: 15 * 1000,                      // 15 seconds
  CSRF_TIMEOUT: 10 * 1000,                     // 10 seconds
  
  /** UI interaction delays */
  LOGOUT_DELAY: 100,                           // 100ms (allow navigation to start)
  REDIRECT_DELAY: 50,                          // 50ms (smooth transitions)
  CACHE_STALE_TIME: 5 * 60 * 1000,            // 5 minutes
} as const;

/**
 * Cookie and storage configuration
 */
export const AUTH_STORAGE = {
  /** Cookie names */
  COOKIES: {
    AUTHENTICATION: 'Authentication',
    AUTHENTICATION_FALLBACK: 'Authentication-Fallback',
    CSRF_TOKEN: 'CSRF-Token',
  },
  
  /** Local storage keys */
  LOCAL_STORAGE: {
    USER_CACHE: 'multitenant_auth_user_cache',
    PLATFORM_CACHE: 'multitenant_platform_cache',
    LOGIN_LOCKOUT: 'loginLockout',
    LOGIN_ATTEMPT_DATA: 'login-attempt-data',
  },
  
  /** Session storage keys */
  SESSION_STORAGE: {
    REDIRECT_URL: 'auth_redirect_url',
    LOGIN_STATE: 'auth_login_state',
  },
} as const;

/**
 * Domain and environment configuration
 */
export const AUTH_DOMAINS = {
  /** Base domain configuration */
  BASE_DOMAIN: process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me',
  
  /** Backend URL configuration */
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://lvh.me:4000',
  
  /** Platform hosts */
  PLATFORM_HOSTS: ['lvh.me', 'localhost', '127.0.0.1'],
  
  /** Port configuration */
  FRONTEND_PORT: process.env.NEXT_PUBLIC_FRONTEND_PORT || '3000',
  BACKEND_PORT: '4000',
} as const;

/**
 * Security and rate limiting configuration
 */
export const AUTH_SECURITY = {
  /** Rate limiting configuration */
  RATE_LIMITS: {
    LOGIN_ATTEMPTS: 5,                          // Max login attempts
    LOGIN_WINDOW: 15 * 60 * 1000,              // 15 minutes window
    LOCKOUT_DURATION: 15 * 60 * 1000,          // 15 minutes lockout
  },
  
  /** Password requirements */
  PASSWORD: {
    MIN_LENGTH: 6,
    REQUIRE_UPPERCASE: false,
    REQUIRE_LOWERCASE: false,
    REQUIRE_NUMBERS: false,
    REQUIRE_SYMBOLS: false,
  },
  
  /** Session security */
  SESSION: {
    SECURE_COOKIES: process.env.NODE_ENV === 'production',
    SAME_SITE: 'lax' as const,
    HTTP_ONLY: true,
  },
} as const;

/**
 * User types and access levels configuration
 */
export const AUTH_ACCESS_LEVELS = {
  /** User access types */
  ACCESS_TYPES: {
    DIRECT: 'direct_access',
    SECURE_LOGIN: 'secure_login',
    IMPERSONATION: 'impersonation',
  },
  
  /** User roles and permissions */
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    PLATFORM_ADMIN: 'platform_admin',
    TENANT_ADMIN: 'tenant_admin',
    TENANT_USER: 'tenant_user',
  },
} as const;

/**
 * Debug and development configuration
 */
export const AUTH_DEBUG = {
  /** Debug environment variables */
  ENABLED: true,
  DEBUG_AUTH: process.env.DEBUG_AUTH === 'true' || true,
  DEBUG_PLATFORM: process.env.DEBUG_PLATFORM === 'true' || true,
  DEBUG_CSRF: process.env.DEBUG_CSRF === 'true',
  
  /** Log levels */
  LOG_LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
  },
} as const;

/**
 * Type exports for TypeScript usage
 */
export type AuthEndpoint = keyof typeof AUTH_ENDPOINTS;
export type PlatformEndpoint = keyof typeof PLATFORM_ENDPOINTS;
export type AuthRoute = keyof typeof AUTH_ROUTES.PUBLIC | keyof typeof AUTH_ROUTES.PLATFORM | keyof typeof AUTH_ROUTES.TENANT;
export type AccessType = typeof AUTH_ACCESS_LEVELS.ACCESS_TYPES[keyof typeof AUTH_ACCESS_LEVELS.ACCESS_TYPES];
export type UserRole = typeof AUTH_ACCESS_LEVELS.ROLES[keyof typeof AUTH_ACCESS_LEVELS.ROLES];

/**
 * Validation utilities for configuration
 */
export const AUTH_VALIDATORS = {
  /** Public routes - explicit allowlist (rarely changes) */
  isPublicRoute(pathname: string): boolean {
    const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];
    return publicRoutes.includes(pathname);
  },
  
  /** Platform route detection - pure pattern matching */
  isPlatformRoute(pathname: string, hostname: string): boolean {
    const isPlatformDomain = this.isPlatformHost(hostname);
    return isPlatformDomain && pathname.startsWith('/platform');
  },
  
  /** Tenant route detection - everything else on tenant domains */
  isTenantRoute(pathname: string, hostname: string): boolean {
    const isTenantDomain = !this.isPlatformHost(hostname);
    const isNotPublic = !this.isPublicRoute(pathname);
    return isTenantDomain && isNotPublic;
  },
  
  /** Route access validation - centralized logic */
  validateRouteAccess(pathname: string, hostname: string, userContext: { tenantId?: string; isSuperAdmin?: boolean; role?: string; email?: string }) {
    // Public routes always allowed
    if (this.isPublicRoute(pathname)) {
      return { allowed: true, reason: 'public_route' };
    }
    
    const isPlatformDomain = this.isPlatformHost(hostname);
    const hasTenantId = !!userContext.tenantId;
    
    if (isPlatformDomain) {
      // Platform domain: must access /platform routes or root
      if (!pathname.startsWith('/platform') && pathname !== '/') {
        return { 
          allowed: false, 
          reason: 'invalid_platform_route',
          redirectTo: '/platform'
        };
      }
      // Root redirect for platform users
      if (pathname === '/' && userContext.isSuperAdmin) {
        return {
          allowed: false,
          reason: 'platform_root_redirect', 
          redirectTo: '/platform'
        };
      }
      
      return { allowed: true, reason: 'valid_platform_access' };
    } else {
      // Tenant domain: tenant users only, platform users need special handling
      if (!hasTenantId && !userContext.isSuperAdmin) {
        return {
          allowed: false,
          reason: 'platform_user_on_tenant_domain',
          redirectTo: `http://lvh.me:3000/login`
        };
      }
      return { allowed: true, reason: 'valid_tenant_access' };
    }
  },
  
  /** Validate if a hostname is a platform host */
  isPlatformHost(hostname: string): boolean {
    // Remove port for comparison
    const cleanHostname = hostname.split(':')[0];
    return AUTH_DOMAINS.PLATFORM_HOSTS.some(host => cleanHostname === host || cleanHostname === `${host}:${AUTH_DOMAINS.FRONTEND_PORT}`);
  },
  
  /** Extract tenant subdomain from hostname */
  getTenantSubdomain(hostname: string): string | null {
    const baseDomain = AUTH_DOMAINS.BASE_DOMAIN;
    // Remove port for comparison
    const cleanHostname = hostname.split(':')[0];
    
    if (cleanHostname.endsWith(`.${baseDomain}`) && !this.isPlatformHost(hostname)) {
      return cleanHostname.replace(`.${baseDomain}`, '');
    }
    return null;
  },
} as const;

/**
 * Default export combining all configuration objects
 */
export const AUTH_CONFIG = {
  ENDPOINTS: AUTH_ENDPOINTS,
  PLATFORM_ENDPOINTS,
  ROUTES: AUTH_ROUTES,
  TIMEOUTS: AUTH_TIMEOUTS,
  STORAGE: AUTH_STORAGE,
  DOMAINS: AUTH_DOMAINS,
  SECURITY: AUTH_SECURITY,
  ACCESS_LEVELS: AUTH_ACCESS_LEVELS,
  DEBUG: AUTH_DEBUG,
  VALIDATORS: AUTH_VALIDATORS,
} as const;

export default AUTH_CONFIG; 