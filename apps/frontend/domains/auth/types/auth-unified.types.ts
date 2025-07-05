/**
 * ================================================================================================
 * UNIFIED AUTHENTICATION TYPES
 * ================================================================================================
 * 
 * Comprehensive TypeScript interfaces for the unified authentication system.
 * This replaces all scattered auth type definitions with a single source of truth.
 * 
 * @author Multitenant Shell Team
 * @version 2.0.0
 * @since 2025-01-01
 */

import { AUTH_ACCESS_LEVELS, AUTH_DEBUG } from '../config/auth.config';

/**
 * ================================================================================================
 * CORE USER AND SESSION TYPES
 * ================================================================================================
 */

/**
 * Base user profile interface with all possible user properties
 */
export interface AuthUserProfile {
  /** Unique user identifier */
  id: string;
  
  /** User email address (unique) */
  email: string;
  
  /** User display name */
  name?: string;
  
  /** User role within their context */
  role?: string;
  
  /** Whether user is a super admin (platform-level access) */
  isSuperAdmin?: boolean;
  
  /** Current tenant context (null for platform users) */
  tenantId?: string | null;
  
  /** User access type */
  accessType?: AuthAccessType;
  
  /** Session expiration timestamp (for temporary sessions) */
  expiresAt?: string;
  
  /** Original user ID (for impersonation sessions) */
  originalUserId?: string;
  
  /** Impersonated user details (when in impersonation mode) */
  impersonation?: {
    userId: string;
    email: string;
    name?: string;
    sessionId: string;
  };
  
  /** User avatar URL */
  avatar?: string;
  
  /** User timezone */
  timezone?: string;
  
  /** User language preference */
  locale?: string;
  
  /** User creation timestamp */
  createdAt?: string;
  
  /** Last login timestamp */
  lastLoginAt?: string;
}

/**
 * Authentication session state
 */
export interface AuthSession {
  /** Current authenticated user */
  user: AuthUserProfile | null;
  
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  
  /** Whether user has super admin privileges */
  isSuperAdmin: boolean;
  
  /** Current tenant ID (null for platform sessions) */
  tenantId: string | null;
  
  /** Session creation timestamp */
  sessionCreatedAt?: string;
  
  /** Session last activity timestamp */
  lastActivity?: string;
  
  /** Whether session is temporary (secure login/impersonation) */
  isTemporary: boolean;
}

/**
 * Platform context information
 */
export interface PlatformContext {
  /** Whether current context is platform (vs tenant) */
  isPlatform: boolean;
  
  /** Current tenant subdomain (null for platform) */
  tenantSubdomain: string | null;
  
  /** Base domain configuration */
  baseDomain: string;
  
  /** Current tenant details (null for platform) */
  currentTenant: PlatformTenant | null;
  
  /** Derived tenant ID */
  tenantId: string | null;
}

/**
 * Tenant information
 */
export interface PlatformTenant {
  /** Unique tenant identifier */
  id: string;
  
  /** Tenant display name */
  name: string;
  
  /** Tenant subdomain */
  subdomain: string;
  
  /** Tenant full URL */
  url: string;
  
  /** Whether tenant is active */
  isActive: boolean;
  
  /** Tenant plan type */
  planType: string;
  
  /** Tenant features */
  features: string[];
  
  /** Tenant user count */
  userCount: number;
  
  /** Tenant creation timestamp */
  createdAt: string;
  
  /** Tenant last update timestamp */
  updatedAt: string;
}

/**
 * ================================================================================================
 * AUTHENTICATION OPERATION TYPES
 * ================================================================================================
 */

/**
 * Login credentials interface
 */
export interface LoginCredentials {
  /** User email address */
  email: string;
  
  /** User password */
  password: string;
  
  /** Whether to remember the user session */
  rememberMe?: boolean;
  
  /** Secure login token (for secure access) */
  secureLoginToken?: string;
  
  /** Target tenant ID (for multi-tenant access) */
  tenantId?: string;
}

/**
 * Login response interface
 */
export interface LoginResponse {
  /** Operation success status */
  success: boolean;
  
  /** User profile data */
  user: AuthUserProfile;
  
  /** Access token (if applicable) */
  token?: string;
  
  /** Session expiration timestamp */
  expiresAt?: string;
  
  /** Redirect URL after login */
  redirectUrl?: string;
  
  /** Additional session metadata */
  metadata?: Record<string, any>;
}

/**
 * Password change request
 */
export interface PasswordChangeRequest {
  /** Current password */
  currentPassword: string;
  
  /** New password */
  newPassword: string;
  
  /** Confirm new password */
  confirmPassword: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  /** User email address */
  email: string;
  
  /** Tenant context (if applicable) */
  tenantId?: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirmation {
  /** Reset token */
  token: string;
  
  /** New password */
  password: string;
  
  /** Confirm new password */
  confirmPassword: string;
}

/**
 * ================================================================================================
 * STATE MANAGEMENT TYPES
 * ================================================================================================
 */

/**
 * Authentication state for the unified context
 */
export interface AuthState {
  /** Current session information */
  session: AuthSession;
  
  /** Platform context information */
  platform: PlatformContext;
  
  /** Loading states */
  loading: {
    /** Whether initial auth check is in progress */
    initializing: boolean;
    
    /** Whether login operation is in progress */
    loggingIn: boolean;
    
    /** Whether logout operation is in progress */
    loggingOut: boolean;
    
    /** Whether refreshing user data */
    refreshing: boolean;
    
    /** Whether fetching tenant data */
    loadingTenant: boolean;
  };
  
  /** Error states */
  error: {
    /** General authentication error */
    auth: string | null;
    
    /** Platform/tenant resolution error */
    platform: string | null;
    
    /** Login-specific error */
    login: string | null;
  };
  
  /** Cache metadata */
  cache: {
    /** Last time user data was fetched */
    userLastFetched: number | null;
    
    /** Last time tenant data was fetched */
    tenantLastFetched: number | null;
    
    /** Whether data is considered stale */
    isStale: boolean;
  };
}

/**
 * Authentication context actions
 */
export interface AuthActions {
  /** User authentication operations */
  login: (credentials: LoginCredentials, redirectUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: (forceRefresh?: boolean) => Promise<AuthUserProfile | null>;
  
  /** Platform operations */
  refreshTenant: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  
  /** Session management */
  clearSession: () => void;
  isSessionValid: () => boolean;
  getSessionTimeRemaining: () => number;
  
  /** Password operations */
  changePassword: (request: PasswordChangeRequest) => Promise<void>;
  requestPasswordReset: (request: PasswordResetRequest) => Promise<void>;
  resetPassword: (confirmation: PasswordResetConfirmation) => Promise<void>;
}

/**
 * Combined authentication context type
 */
export interface AuthContextValue extends AuthState, AuthActions {}

/**
 * ================================================================================================
 * API AND NETWORK TYPES
 * ================================================================================================
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  /** Operation success status */
  success: boolean;
  
  /** Response data */
  data?: T;
  
  /** Error message (if failed) */
  message?: string;
  
  /** Detailed error information */
  error?: {
    code: string;
    details?: Record<string, any>;
  };
  
  /** Response metadata */
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * API error interface
 */
export interface AuthApiError extends Error {
  /** HTTP status code */
  status?: number;
  
  /** Error code */
  code?: string;
  
  /** Additional error details */
  details?: Record<string, any>;
  
  /** Whether error is retryable */
  retryable?: boolean;
}

/**
 * Network request configuration
 */
export interface RequestConfig {
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Whether to include credentials */
  credentials?: 'include' | 'omit' | 'same-origin';
  
  /** Additional headers */
  headers?: Record<string, string>;
  
  /** Whether to retry on failure */
  retry?: boolean;
  
  /** Number of retry attempts */
  retryCount?: number;
  
  /** Whether to bypass cache */
  bypassCache?: boolean;
}

/**
 * ================================================================================================
 * ROUTING AND NAVIGATION TYPES
 * ================================================================================================
 */

/**
 * Route context information
 */
export interface RouteContext {
  /** Current pathname */
  pathname: string;
  
  /** Current hostname */
  hostname: string;
  
  /** Whether route is public */
  isPublic: boolean;
  
  /** Whether route is platform-specific */
  isPlatformRoute: boolean;
  
  /** Whether route is tenant-specific */
  isTenantRoute: boolean;
  
  /** Required access level for route */
  requiredAccessLevel?: AuthAccessLevel;
}

/**
 * Redirect configuration
 */
export interface RedirectConfig {
  /** Target URL */
  url: string;
  
  /** Whether redirect should replace current history entry */
  replace?: boolean;
  
  /** Delay before redirect (in milliseconds) */
  delay?: number;
  
  /** Reason for redirect (for debugging) */
  reason?: string;
}

/**
 * ================================================================================================
 * UTILITY AND HELPER TYPES
 * ================================================================================================
 */

/**
 * Access type enumeration
 */
export type AuthAccessType = typeof AUTH_ACCESS_LEVELS.ACCESS_TYPES[keyof typeof AUTH_ACCESS_LEVELS.ACCESS_TYPES];

/**
 * User role enumeration
 */
export type AuthRole = typeof AUTH_ACCESS_LEVELS.ROLES[keyof typeof AUTH_ACCESS_LEVELS.ROLES];

/**
 * Access level enumeration (combining types and roles)
 */
export type AuthAccessLevel = AuthAccessType | AuthRole;

/**
 * Log level enumeration
 */
export type LogLevel = typeof AUTH_DEBUG.LOG_LEVELS[keyof typeof AUTH_DEBUG.LOG_LEVELS];

/**
 * Cache entry interface
 */
export interface CacheEntry<T> {
  /** Cached data */
  data: T;
  
  /** Cache entry timestamp */
  timestamp: number;
  
  /** Cache entry expiration time */
  expiresAt: number;
  
  /** Cache entry key */
  key: string;
}

/**
 * Debug information interface
 */
export interface DebugInfo {
  /** Current auth state summary */
  authState: Partial<AuthState>;
  
  /** Performance metrics */
  performance: {
    lastLoginDuration?: number;
    lastRefreshDuration?: number;
    apiCallCount: number;
  };
  
  /** Cache statistics */
  cache: {
    hitRate: number;
    size: number;
    oldestEntry?: number;
  };
}

/**
 * ================================================================================================
 * EVENT AND CALLBACK TYPES
 * ================================================================================================
 */

/**
 * Authentication event types
 */
export type AuthEventType = 
  | 'login'
  | 'logout'
  | 'session_expired'
  | 'user_updated'
  | 'tenant_switched'
  | 'error'
  | 'cache_cleared';

/**
 * Authentication event data
 */
export interface AuthEvent {
  /** Event type */
  type: AuthEventType;
  
  /** Event timestamp */
  timestamp: number;
  
  /** Event data */
  data?: any;
  
  /** Event metadata */
  metadata?: {
    source: string;
    userId?: string;
    tenantId?: string;
  };
}

/**
 * Event listener callback
 */
export type AuthEventListener = (event: AuthEvent) => void;

/**
 * ================================================================================================
 * EXPORT ALL TYPES
 * ================================================================================================
 */

export type {
  // Re-export config types for convenience
  AuthEndpoint,
  PlatformEndpoint,
  AuthRoute,
  AccessType,
  UserRole,
} from '../config/auth.config'; 