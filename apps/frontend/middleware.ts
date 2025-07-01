import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from 'jose';
import { isPlatformHost, getTenantSubdomain } from '@/shared/utils/contextUtils';

interface JwtPayload {
  tenantContext?: string;
  tenantId?: string;
  isSuperAdmin?: boolean;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host')!;

  console.log(`[Middleware] Processing request: ${hostname}${pathname}`);

  // Allow requests for static files and API routes to pass through
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/static') || /\..*$/.test(pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get('Authentication');
  const isPlatform = isPlatformHost(hostname);
  const tenantSubdomain = getTenantSubdomain(hostname);

  console.log(`[Middleware] Domain analysis:`, {
    hostname,
    isPlatform,
    tenantSubdomain,
    pathname,
    hasCookie: !!cookie
  });

  // If there's no auth cookie, redirect to login for any protected path
  if (!cookie && pathname !== '/login') {
    // Check if there's a secure login token - if so, preserve it in the redirect
    const secureLoginToken = request.nextUrl.searchParams.get('secureLoginToken');
    console.log(`[Middleware] No auth cookie, redirecting to login`);
    const loginUrl = new URL('/login', request.url);
    if (secureLoginToken) {
      loginUrl.searchParams.set('secureLoginToken', secureLoginToken);
      console.log(`[Middleware] Preserving secure login token in redirect`);
    }
    return NextResponse.redirect(loginUrl);
  }

  // If accessing login page, allow it regardless of auth status
  if (pathname === '/login') {
    console.log(`[Middleware] Login page access allowed`);
    return NextResponse.next();
  }

  if (cookie) {
    try {
      const payload = decodeJwt<JwtPayload>(cookie.value);
      const tenantId = payload.tenantContext || payload.tenantId;

      console.log(`[Middleware] Token analysis:`, {
        tenantId: tenantId || 'none',
        isSuperAdmin: payload.isSuperAdmin,
        isPlatform,
        pathname
      });

      // SCENARIO 1: Logged into a TENANT session.
      if (tenantId) {
        // If they have a tenant token but try to access the PLATFORM domain, log them out.
        if (isPlatform) {
          console.log('[Middleware] Tenant session on platform domain - clearing session');
          const loginUrl = new URL('/login', request.url);
          const response = NextResponse.redirect(loginUrl);
          response.cookies.delete('Authentication');
          return response;
        }
        
        // Block access to platform routes from tenant subdomains
        if (pathname.startsWith('/platform')) {
          console.log(`[Middleware] Blocking platform route ${pathname} from tenant subdomain - redirecting to /`);
          const url = request.nextUrl.clone();
          url.pathname = '/';
          return NextResponse.redirect(url);
        }
      } 
      // SCENARIO 2: Logged into a PLATFORM/MASTER session.
      else {
        console.log(`[Middleware] Platform session detected`);
        
        // If they have a platform token and are NOT a super admin, block access to tenant domains.
        if (!isPlatform && !payload.isSuperAdmin) {
          console.log('[Middleware] Non-superadmin platform session on tenant domain - clearing session');
          const loginUrl = new URL('/login', request.url);
          const response = NextResponse.redirect(loginUrl);
          response.cookies.delete('Authentication');
          return response;
        }

        // CRITICAL FIX: Platform users should go directly to /platform, not stay on /
        if (isPlatform && payload.isSuperAdmin && pathname === '/') {
          console.log('[Middleware] Platform admin on root route - redirecting to /platform');
          const url = request.nextUrl.clone();
          url.pathname = '/platform';
          return NextResponse.redirect(url);
        }
      }
      
    } catch (error) {
      console.error('[Middleware] Invalid token, redirecting to login:', error);
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('Authentication');
      return response;
    }
  }

  console.log(`[Middleware] Request allowed to proceed`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 