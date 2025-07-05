/**
 * ================================================================================================
 * UNIFIED AUTHENTICATION CONTEXT
 * ================================================================================================
 * 
 * Single, optimized authentication context that replaces both AuthContext and PlatformContext.
 * This context uses the session manager and route manager services for efficient state management.
 * 
 * Key Features:
 * - Unified auth and platform state management
 * - Minimized API calls with smart caching
 * - Optimized re-rendering with proper memoization
 * - Comprehensive error handling and recovery
 * - Real-time session validation
 * - Event-driven architecture for extensibility
 * 
 * @author Multitenant Shell Team
 * @version 2.0.0
 * @since 2025-01-01
 */

'use client';

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';

import { useRouter, usePathname } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

import { 
  AuthState,
  AuthContextValue,
  AuthUserProfile,
  LoginCredentials,
  LoginResponse,
  PasswordChangeRequest,
  PasswordResetRequest,
  PasswordResetConfirmation,
  RouteContext,
  RedirectConfig,
} from '../types/auth-unified.types';

import { 
  AUTH_CONFIG,
  AUTH_ROUTES,
  AUTH_VALIDATORS,
  AUTH_DEBUG,
  AUTH_TIMEOUTS,
} from '../config/auth.config';

import { sessionManager } from '../services/session-manager.service';
import { routeManager } from '../services/route-manager.service';

/**
 * ================================================================================================
 * UNIFIED AUTH CONTEXT
 * ================================================================================================
 */

const UnifiedAuthContext = createContext<AuthContextValue | null>(null);

/**
 * ================================================================================================
 * UNIFIED AUTH PROVIDER
 * ================================================================================================
 */

interface UnifiedAuthProviderProps {
  children: ReactNode;
}

export function UnifiedAuthProvider({ children }: UnifiedAuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // State management
  const [authState, setAuthState] = useState<AuthState>({
    session: {
      user: null,
      isAuthenticated: false,
      isSuperAdmin: false,
      tenantId: null,
      isTemporary: false,
    },
    platform: {
      isPlatform: true,
      tenantSubdomain: null,
      baseDomain: AUTH_CONFIG.DOMAINS.BASE_DOMAIN,
      currentTenant: null,
      tenantId: null,
    },
    loading: {
      initializing: true,
      loggingIn: false,
      loggingOut: false,
      refreshing: false,
      loadingTenant: false,
    },
    error: {
      auth: null,
      platform: null,
      login: null,
    },
    cache: {
      userLastFetched: null,
      tenantLastFetched: null,
      isStale: false,
    },
  });

  // Refs for cleanup and optimization
  const initializationRef = useRef<boolean>(false);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const routeChangeListenerRef = useRef<((context: RouteContext) => void) | null>(null);

  /**
   * ================================================================================================
   * INITIALIZATION AND CLEANUP
   * ================================================================================================
   */

  /**
   * Initialize the unified auth system
   */
  const initializeAuth = useCallback(async () => {
    if (initializationRef.current) {
      return;
    }
    
    initializationRef.current = true;
    
    try {
      log('info', 'Initializing unified auth system');
      
      // Get initial platform context
      const platformContext = routeManager.getPlatformContextFromHostname(
        typeof window !== 'undefined' ? window.location.hostname : 'localhost'
      );
      
      // Analyze current route
      const routeContext = routeManager.analyzeRoute(pathname);
      
      // Update platform state
      setAuthState(prev => ({
        ...prev,
        platform: { ...prev.platform, ...platformContext },
      }));
      
      // Skip auth check on public pages
      if (routeContext.isPublic) {
        log('debug', 'Public route - skipping auth check', { pathname });
        
        // Still try to get cached user data
        const cachedSession = sessionManager.getSession();
        if (cachedSession.user) {
          setAuthState(prev => ({
            ...prev,
            session: cachedSession,
            loading: { ...prev.loading, initializing: false },
          }));
        } else {
          setAuthState(prev => ({
            ...prev,
            loading: { ...prev.loading, initializing: false },
          }));
        }
        return;
      }
      
      // Check authentication status
      const user = await sessionManager.refreshUser(false);
      const session = sessionManager.getSession();
      
      // Load tenant data if on tenant subdomain
      if (platformContext.tenantSubdomain && !platformContext.currentTenant) {
        setAuthState(prev => ({
          ...prev,
          loading: { ...prev.loading, loadingTenant: true },
        }));
        
        try {
          const tenant = await sessionManager.refreshTenant();
          const updatedPlatform = sessionManager.getPlatformContext();
          
          setAuthState(prev => ({
            ...prev,
            platform: updatedPlatform,
            loading: { ...prev.loading, loadingTenant: false },
            cache: { ...prev.cache, tenantLastFetched: Date.now() },
          }));
        } catch (error) {
          log('error', 'Failed to load tenant data', { error: (error as Error).message });
          setAuthState(prev => ({
            ...prev,
            loading: { ...prev.loading, loadingTenant: false },
            error: { ...prev.error, platform: (error as Error).message },
          }));
        }
      }
      
      // Update final state
      setAuthState(prev => ({
        ...prev,
        session,
        loading: { ...prev.loading, initializing: false },
        cache: { ...prev.cache, userLastFetched: Date.now() },
      }));
      
      // Check route access and redirect if necessary
      if (user && !routeManager.hasRouteAccess(user, platformContext, routeContext)) {
        const redirectUrl = routeManager.getUnauthorizedRoute(user, platformContext, pathname);
        await routeManager.executeRedirect({
          url: redirectUrl,
          reason: 'unauthorized_access',
        }, router);
      }
      
      log('info', 'Auth initialization completed', { 
        isAuthenticated: !!user,
        userId: user?.id,
        tenantId: platformContext.tenantId,
      });
      
    } catch (error) {
      log('error', 'Auth initialization failed', { error: (error as Error).message });
      setAuthState(prev => ({
        ...prev,
        loading: { ...prev.loading, initializing: false },
        error: { ...prev.error, auth: (error as Error).message },
      }));
    }
  }, [pathname, router]);

  /**
   * Setup session validation interval
   */
  const setupSessionValidation = useCallback(() => {
    // Clear any existing interval
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
    }
    
    // Only validate if authenticated
    if (!authState.session.isAuthenticated) {
      return;
    }
    
    // Check session validity every 5 minutes
    sessionCheckIntervalRef.current = setInterval(() => {
      const isValid = sessionManager.isSessionValid();
      
      if (!isValid) {
        log('info', 'Session expired, logging out');
        logout();
      }
    }, 5 * 60 * 1000);
  }, [authState.session.isAuthenticated]);

  /**
   * Setup route change listener
   */
  const setupRouteChangeListener = useCallback(() => {
    if (routeChangeListenerRef.current) {
      routeManager.removeRouteChangeListener(routeChangeListenerRef.current);
    }
    
    routeChangeListenerRef.current = (routeContext: RouteContext) => {
      log('debug', 'Route changed', { pathname: routeContext.pathname });
      
      // Update platform context if hostname changed
      const newPlatformContext = routeManager.getPlatformContextFromHostname(routeContext.hostname);
      setAuthState(prev => ({
        ...prev,
        platform: { ...prev.platform, ...newPlatformContext },
      }));
    };
    
    routeManager.addRouteChangeListener(routeChangeListenerRef.current);
  }, []);

  /**
   * ================================================================================================
   * AUTHENTICATION OPERATIONS
   * ================================================================================================
   */

  /**
   * Login with credentials
   */
  const login = useCallback(async (credentials: LoginCredentials, redirectUrl?: string) => {
    setAuthState(prev => ({
      ...prev,
      loading: { ...prev.loading, loggingIn: true },
      error: { ...prev.error, login: null },
    }));
    
    try {
      log('info', 'Starting login process', { email: credentials.email });
      
      const loginResponse = await sessionManager.login(credentials, redirectUrl);
      const session = sessionManager.getSession();
      const platform = sessionManager.getPlatformContext();
      
      // Update state
      setAuthState(prev => ({
        ...prev,
        session,
        platform,
        loading: { ...prev.loading, loggingIn: false },
        cache: { ...prev.cache, userLastFetched: Date.now() },
      }));
      
      // Get post-login route
      const postLoginRoute = routeManager.getPostLoginRoute(
        session.user!,
        platform,
        redirectUrl
      );
      
      // Execute redirect
      await routeManager.executeRedirect({
        url: postLoginRoute,
        reason: 'successful_login',
      }, router);
      
      log('info', 'Login successful', { 
        userId: session.user?.id,
        redirectUrl: postLoginRoute,
      });
      
    } catch (error) {
      log('error', 'Login failed', { error: (error as Error).message });
      setAuthState(prev => ({
        ...prev,
        loading: { ...prev.loading, loggingIn: false },
        error: { ...prev.error, login: (error as Error).message },
      }));
      throw error;
    }
  }, [router]);

  /**
   * Logout current user
   */
  const logout = useCallback(async () => {
    setAuthState(prev => ({
      ...prev,
      loading: { ...prev.loading, loggingOut: true },
    }));
    
    try {
      log('info', 'Starting logout process');
      
      await sessionManager.logout();
      
      // Clear state
      setAuthState(prev => ({
        ...prev,
        session: {
          user: null,
          isAuthenticated: false,
          isSuperAdmin: false,
          tenantId: null,
          isTemporary: false,
        },
        loading: { ...prev.loading, loggingOut: false },
        error: { auth: null, platform: null, login: null },
        cache: { userLastFetched: null, tenantLastFetched: null, isStale: false },
      }));
      
      // Get logout route
      const logoutRoute = routeManager.getLogoutRoute(authState.platform);
      
      // Execute redirect
      await routeManager.executeRedirect({
        url: logoutRoute,
        reason: 'logout',
        delay: AUTH_TIMEOUTS.LOGOUT_DELAY,
      }, router);
      
      log('info', 'Logout successful');
      
    } catch (error) {
      log('error', 'Logout failed', { error: (error as Error).message });
      
      // Still clear state and redirect even if API fails
      setAuthState(prev => ({
        ...prev,
        session: {
          user: null,
          isAuthenticated: false,
          isSuperAdmin: false,
          tenantId: null,
          isTemporary: false,
        },
        loading: { ...prev.loading, loggingOut: false },
      }));
      
      const logoutRoute = routeManager.getLogoutRoute(authState.platform);
      await routeManager.executeRedirect({
        url: logoutRoute,
        reason: 'logout_with_error',
        delay: AUTH_TIMEOUTS.LOGOUT_DELAY,
      }, router);
    }
  }, [router, authState.platform]);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async (forceRefresh = false) => {
    if (authState.loading.refreshing) {
      return authState.session.user;
    }
    
    setAuthState(prev => ({
      ...prev,
      loading: { ...prev.loading, refreshing: true },
      error: { ...prev.error, auth: null },
    }));
    
    try {
      const user = await sessionManager.refreshUser(forceRefresh);
      const session = sessionManager.getSession();
      
      setAuthState(prev => ({
        ...prev,
        session,
        loading: { ...prev.loading, refreshing: false },
        cache: { ...prev.cache, userLastFetched: Date.now() },
      }));
      
      return user;
    } catch (error) {
      log('error', 'Failed to refresh user', { error: (error as Error).message });
      setAuthState(prev => ({
        ...prev,
        loading: { ...prev.loading, refreshing: false },
        error: { ...prev.error, auth: (error as Error).message },
      }));
      throw error;
    }
  }, [authState.loading.refreshing, authState.session.user]);

  /**
   * ================================================================================================
   * PLATFORM OPERATIONS
   * ================================================================================================
   */

  /**
   * Refresh tenant data
   */
  const refreshTenant = useCallback(async () => {
    if (authState.loading.loadingTenant) {
      return;
    }
    
    setAuthState(prev => ({
      ...prev,
      loading: { ...prev.loading, loadingTenant: true },
      error: { ...prev.error, platform: null },
    }));
    
    try {
      const tenant = await sessionManager.refreshTenant();
      const platform = sessionManager.getPlatformContext();
      
      setAuthState(prev => ({
        ...prev,
        platform,
        loading: { ...prev.loading, loadingTenant: false },
        cache: { ...prev.cache, tenantLastFetched: Date.now() },
      }));
      
    } catch (error) {
      log('error', 'Failed to refresh tenant', { error: (error as Error).message });
      setAuthState(prev => ({
        ...prev,
        loading: { ...prev.loading, loadingTenant: false },
        error: { ...prev.error, platform: (error as Error).message },
      }));
      throw error;
    }
  }, [authState.loading.loadingTenant]);

  /**
   * Switch tenant (for super admins)
   */
  const switchTenant = useCallback(async (tenantId: string) => {
    if (!authState.session.user?.isSuperAdmin) {
      throw new Error('Only super admins can switch tenants');
    }
    
    try {
      log('info', 'Switching tenant', { tenantId });
      
      // Build tenant URL and navigate
      const tenantUrl = routeManager.buildTenantUrl(tenantId, AUTH_ROUTES.TENANT.HOME);
      
      await routeManager.executeRedirect({
        url: tenantUrl,
        reason: 'tenant_switch',
      }, router);
      
    } catch (error) {
      log('error', 'Failed to switch tenant', { error: (error as Error).message });
      throw error;
    }
  }, [authState.session.user, router]);

  /**
   * ================================================================================================
   * SESSION MANAGEMENT
   * ================================================================================================
   */

  /**
   * Clear session
   */
  const clearSession = useCallback(() => {
    sessionManager.clearSession();
    
    setAuthState(prev => ({
      ...prev,
      session: {
        user: null,
        isAuthenticated: false,
        isSuperAdmin: false,
        tenantId: null,
        isTemporary: false,
      },
      error: { auth: null, platform: null, login: null },
      cache: { userLastFetched: null, tenantLastFetched: null, isStale: false },
    }));
  }, []);

  /**
   * Check if session is valid
   */
  const isSessionValid = useCallback(() => {
    return sessionManager.isSessionValid();
  }, []);

  /**
   * Get session time remaining
   */
  const getSessionTimeRemaining = useCallback(() => {
    return sessionManager.getSessionTimeRemaining();
  }, []);

  /**
   * ================================================================================================
   * PASSWORD OPERATIONS
   * ================================================================================================
   */

  /**
   * Change password
   */
  const changePassword = useCallback(async (request: PasswordChangeRequest) => {
    // Implementation would use session manager to make API call
    throw new Error('Password change not implemented yet');
  }, []);

  /**
   * Request password reset
   */
  const requestPasswordReset = useCallback(async (request: PasswordResetRequest) => {
    // Implementation would use session manager to make API call
    throw new Error('Password reset not implemented yet');
  }, []);

  /**
   * Reset password
   */
  const resetPassword = useCallback(async (confirmation: PasswordResetConfirmation) => {
    // Implementation would use session manager to make API call
    throw new Error('Password reset confirmation not implemented yet');
  }, []);

  /**
   * ================================================================================================
   * EFFECTS AND LIFECYCLE
   * ================================================================================================
   */

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Setup session validation
  useEffect(() => {
    setupSessionValidation();
    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
    };
  }, [setupSessionValidation]);

  // Setup route change listener
  useEffect(() => {
    setupRouteChangeListener();
    return () => {
      if (routeChangeListenerRef.current) {
        routeManager.removeRouteChangeListener(routeChangeListenerRef.current);
      }
    };
  }, [setupRouteChangeListener]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
      if (routeChangeListenerRef.current) {
        routeManager.removeRouteChangeListener(routeChangeListenerRef.current);
      }
    };
  }, []);

  /**
   * ================================================================================================
   * MEMOIZED CONTEXT VALUE
   * ================================================================================================
   */

  const contextValue = useMemo<AuthContextValue>(() => ({
    // State
    ...authState,
    
    // Actions
    login,
    logout,
    refreshUser,
    refreshTenant,
    switchTenant,
    clearSession,
    isSessionValid,
    getSessionTimeRemaining,
    changePassword,
    requestPasswordReset,
    resetPassword,
  }), [
    authState,
    login,
    logout,
    refreshUser,
    refreshTenant,
    switchTenant,
    clearSession,
    isSessionValid,
    getSessionTimeRemaining,
    changePassword,
    requestPasswordReset,
    resetPassword,
  ]);

  /**
   * ================================================================================================
   * RENDER
   * ================================================================================================
   */

  // Show loading spinner during initialization
  if (authState.loading.initializing) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <UnifiedAuthContext.Provider value={contextValue}>
      {children}
    </UnifiedAuthContext.Provider>
  );
}

/**
 * ================================================================================================
 * HOOKS
 * ================================================================================================
 */

/**
 * Main auth hook - replaces useAuth
 */
export function useAuth(): AuthContextValue {
  const context = useContext(UnifiedAuthContext);
  if (!context) {
    throw new Error('useAuth must be used within UnifiedAuthProvider');
  }
  return context;
}

/**
 * Platform-specific hook - replaces usePlatform
 */
export function usePlatform() {
  const { platform } = useAuth();
  return platform;
}

/**
 * Tenant-specific hook - replaces useTenantId
 */
export function useTenantId(): string | null {
  const { platform } = useAuth();
  return platform.tenantId;
}

/**
 * Session-specific hook
 */
export function useSession() {
  const { session } = useAuth();
  return session;
}

/**
 * Current user hook
 */
export function useCurrentUser(): AuthUserProfile | null {
  const { session } = useAuth();
  return session.user;
}

/**
 * Loading states hook
 */
export function useAuthLoading() {
  const { loading } = useAuth();
  return loading;
}

/**
 * Error states hook
 */
export function useAuthError() {
  const { error } = useAuth();
  return error;
}

/**
 * ================================================================================================
 * UTILITIES
 * ================================================================================================
 */

/**
 * Logging utility
 */
function log(level: string, message: string, data?: any): void {
  if (!AUTH_DEBUG.ENABLED) {
    return;
  }
  
  const logData = {
    component: 'UnifiedAuthContext',
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  };
  
  switch (level) {
    case 'error':
      console.error(`[UnifiedAuth] ${message}`, logData);
      break;
    case 'warn':
      console.warn(`[UnifiedAuth] ${message}`, logData);
      break;
    case 'info':
      console.info(`[UnifiedAuth] ${message}`, logData);
      break;
    case 'debug':
      if (AUTH_DEBUG.DEBUG_AUTH) {
        console.log(`[UnifiedAuth] ${message}`, logData);
      }
      break;
  }
}

/**
 * ================================================================================================
 * EXPORTS
 * ================================================================================================
 */

export { UnifiedAuthContext };
export default UnifiedAuthProvider; 