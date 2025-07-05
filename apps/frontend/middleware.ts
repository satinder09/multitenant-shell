/**
 * ================================================================================================
 * OPTIMIZED AUTHENTICATION MIDDLEWARE
 * ================================================================================================
 * 
 * Streamlined middleware that works with the unified authentication system.
 * This middleware removes redundancy and improves efficiency by leveraging
 * the auth configuration and validators.
 * 
 * Key Features:
 * - Uses centralized auth configuration
 * - Leverages auth validators for consistency
 * - Optimized redirect logic
 * - Proper error handling and logging
 * - Supports secure login tokens
 * - Clear separation of concerns
 * 
 * @author Multitenant Shell Team
 * @version 2.0.0
 * @since 2025-01-01
 */

import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from 'jose';

// Import auth configuration for consistency
import { 
  AUTH_CONFIG, 
  AUTH_ROUTES, 
  AUTH_VALIDATORS, 
  AUTH_STORAGE, 
  AUTH_DEBUG,
} from '@/domains/auth/config/auth.config';

/**
 * JWT token payload interface
 */
interface JwtPayload {
  tenantContext?: string;
  tenantId?: string;
  isSuperAdmin?: boolean;
  role?: string;
  email?: string;
  exp?: number;
}

/**
 * ================================================================================================
 * MAIN MIDDLEWARE FUNCTION
 * ================================================================================================
 */

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || 'localhost';
  
  // Log request if debug mode is enabled
  if (AUTH_DEBUG.ENABLED) {
    console.log(`[Middleware] Processing: ${hostname}${pathname}`);
  }
  
  try {
    // Skip middleware for static files, API routes, and Next.js internals
    if (shouldSkipMiddleware(pathname)) {
      return NextResponse.next();
    }
    
    // Analyze request context
    const requestContext = analyzeRequest(request, hostname, pathname);
    
    // Get authentication cookie
    const authCookie = request.cookies.get(AUTH_STORAGE.COOKIES.AUTHENTICATION);
    
    // Handle authentication logic
    const authResult = await handleAuthentication(request, requestContext, authCookie);
    
    // Log completion time if debug mode is enabled
    if (AUTH_DEBUG.ENABLED) {
      const duration = Date.now() - startTime;
      console.log(`[Middleware] Completed in ${duration}ms:`, {
        pathname,
        result: authResult.action,
        duration,
      });
    }
    
    return authResult.response;
    
  } catch (error) {
    console.error('[Middleware] Error:', error);
    
    // Redirect to login on error
    const loginUrl = buildLoginUrl(request, pathname);
    return NextResponse.redirect(loginUrl);
  }
}

/**
 * ================================================================================================
 * HELPER FUNCTIONS
 * ================================================================================================
 */

/**
 * Check if middleware should be skipped for this path
 */
function shouldSkipMiddleware(pathname: string): boolean {
  const skipPatterns = [
    // Next.js internals
    '/_next',
    '/__nextjs_original-stack-frame',
    
    // Static files
    '/static',
    '/public',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    
    // API routes
    '/api',
    
    // Files with extensions
    /\.\w+$/,
  ];
  
  return skipPatterns.some(pattern => {
    if (typeof pattern === 'string') {
      return pathname.startsWith(pattern);
    }
    return pattern.test(pathname);
  });
}

/**
 * Analyze request context
 */
function analyzeRequest(request: NextRequest, hostname: string, pathname: string) {
  const isPlatform = AUTH_VALIDATORS.isPlatformHost(hostname);
  const tenantSubdomain = AUTH_VALIDATORS.getTenantSubdomain(hostname);
  const isPublicRoute = AUTH_VALIDATORS.isPublicRoute(pathname);
  const isPlatformRoute = AUTH_VALIDATORS.isPlatformRoute(pathname);
  const isTenantRoute = AUTH_VALIDATORS.isTenantRoute(pathname);
  
  return {
    hostname,
    pathname,
    isPlatform,
    tenantSubdomain,
    isPublicRoute,
    isPlatformRoute,
    isTenantRoute,
    secureLoginToken: request.nextUrl.searchParams.get('secureLoginToken'),
  };
}

/**
 * Handle authentication logic
 */
async function handleAuthentication(
  request: NextRequest,
  context: ReturnType<typeof analyzeRequest>,
  authCookie?: any
): Promise<{ action: string; response: NextResponse }> {
  const { pathname, isPlatform, tenantSubdomain, isPublicRoute, isPlatformRoute, isTenantRoute, secureLoginToken } = context;
  
  // Allow public routes without authentication
  if (isPublicRoute) {
    if (AUTH_DEBUG.ENABLED) {
      console.log('[Middleware] Public route allowed:', pathname);
    }
    return { action: 'allow_public', response: NextResponse.next() };
  }
  
  // If no authentication cookie, redirect to login
  if (!authCookie) {
    if (AUTH_DEBUG.ENABLED) {
      console.log('[Middleware] No auth cookie, redirecting to login');
    }
    
    const loginUrl = buildLoginUrl(request, pathname, secureLoginToken);
    return { action: 'redirect_no_auth', response: NextResponse.redirect(loginUrl) };
  }
  
  // Decode and validate JWT token
  let payload: JwtPayload;
  try {
    payload = decodeJwt<JwtPayload>(authCookie.value);
  } catch (error) {
    if (AUTH_DEBUG.ENABLED) {
      console.log('[Middleware] Invalid JWT token, redirecting to login');
    }
    
    const loginUrl = buildLoginUrl(request, pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(AUTH_STORAGE.COOKIES.AUTHENTICATION);
    return { action: 'redirect_invalid_token', response };
  }
  
  // Check token expiration
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    if (AUTH_DEBUG.ENABLED) {
      console.log('[Middleware] Token expired, redirecting to login');
    }
    
    const loginUrl = buildLoginUrl(request, pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(AUTH_STORAGE.COOKIES.AUTHENTICATION);
    return { action: 'redirect_expired_token', response };
  }
  
  // Analyze user context
  const userContext = {
    tenantId: payload.tenantContext || payload.tenantId,
    isSuperAdmin: payload.isSuperAdmin || false,
    role: payload.role,
    email: payload.email,
  };
  
  if (AUTH_DEBUG.ENABLED) {
    console.log('[Middleware] User context:', userContext);
  }
  
  // Apply access control rules
  const accessControl = checkAccessControl(context, userContext);
  
  if (accessControl.allowed) {
    return { action: 'allow_authenticated', response: NextResponse.next() };
  } else {
    return { action: 'redirect_access_denied', response: accessControl.response || NextResponse.next() };
  }
}

/**
 * Check access control rules
 */
function checkAccessControl(
  context: ReturnType<typeof analyzeRequest>,
  userContext: { tenantId?: string; isSuperAdmin: boolean; role?: string; email?: string }
): { allowed: boolean; response?: NextResponse } {
  const { pathname, isPlatform, tenantSubdomain, isPlatformRoute, isTenantRoute } = context;
  const { tenantId, isSuperAdmin, role } = userContext;
  
  // SCENARIO 1: User has tenant session
  if (tenantId) {
    // Tenant user trying to access platform domain
    if (isPlatform) {
      if (AUTH_DEBUG.ENABLED) {
        console.log('[Middleware] Tenant user on platform domain - clearing session');
      }
      
      const loginUrl = buildLoginUrl(context.hostname, pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(AUTH_STORAGE.COOKIES.AUTHENTICATION);
      return { allowed: false, response };
    }
    
    // Tenant user trying to access platform routes on tenant domain
    if (isPlatformRoute) {
      if (AUTH_DEBUG.ENABLED) {
        console.log('[Middleware] Blocking platform route access from tenant subdomain');
      }
      
      const redirectUrl = new URL(AUTH_ROUTES.TENANT.HOME, `${context.hostname.includes('https') ? 'https' : 'http'}://${context.hostname}`);
      return { allowed: false, response: NextResponse.redirect(redirectUrl) };
    }
    
    // Allow tenant user on tenant domain
    return { allowed: true };
  }
  
  // SCENARIO 2: User has platform session (no tenant ID)
  else {
    // Platform user on tenant domain
    if (!isPlatform && !isSuperAdmin) {
      if (AUTH_DEBUG.ENABLED) {
        console.log('[Middleware] Non-superadmin platform user on tenant domain - clearing session');
      }
      
      const loginUrl = buildLoginUrl(context.hostname, pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(AUTH_STORAGE.COOKIES.AUTHENTICATION);
      return { allowed: false, response };
    }
    
    // Platform user on platform domain accessing root - redirect to platform dashboard
    if (isPlatform && isSuperAdmin && pathname === '/') {
      if (AUTH_DEBUG.ENABLED) {
        console.log('[Middleware] Platform admin on root - redirecting to platform dashboard');
      }
      
      const platformUrl = new URL(AUTH_ROUTES.PLATFORM.HOME, `${context.hostname.includes('https') ? 'https' : 'http'}://${context.hostname}`);
      return { allowed: false, response: NextResponse.redirect(platformUrl) };
    }
    
    // Check platform route access
    if (isPlatformRoute && !isSuperAdmin && role !== 'platform_admin') {
      if (AUTH_DEBUG.ENABLED) {
        console.log('[Middleware] Insufficient permissions for platform route');
      }
      
      const homeUrl = new URL(AUTH_ROUTES.TENANT.HOME, `${context.hostname.includes('https') ? 'https' : 'http'}://${context.hostname}`);
      return { allowed: false, response: NextResponse.redirect(homeUrl) };
    }
    
    // Allow platform user
    return { allowed: true };
  }
}

/**
 * Build login URL with proper parameters
 */
function buildLoginUrl(
  request: NextRequest | string,
  currentPath?: string,
  secureToken?: string | null
): URL {
  let baseUrl: string;
  
  if (typeof request === 'string') {
    // hostname string provided
    baseUrl = `${request.includes('https') ? 'https' : 'http'}://${request}`;
  } else {
    // NextRequest object provided
    baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  }
  
  const loginUrl = new URL(AUTH_ROUTES.PUBLIC.LOGIN, baseUrl);
  
  // Add redirect parameter if current path is not login
  if (currentPath && currentPath !== AUTH_ROUTES.PUBLIC.LOGIN) {
    loginUrl.searchParams.set('redirect', currentPath);
  }
  
  // Add secure login token if provided
  if (secureToken) {
    loginUrl.searchParams.set('secureLoginToken', secureToken);
  }
  
  return loginUrl;
}

/**
 * ================================================================================================
 * MIDDLEWARE CONFIGURATION
 * ================================================================================================
 */

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt, sitemap.xml (SEO files)
     * - Files with extensions (images, fonts, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
}; 