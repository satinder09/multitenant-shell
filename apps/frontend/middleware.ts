import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from 'jose';
import { isPlatformHost, getTenantSubdomain } from './lib/contextUtils';

interface JwtPayload {
  tenantId?: string;
  isSuperAdmin?: boolean;
}



export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host')!;

  // Allow requests for static files and API routes to pass through
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/static') || /\..*$/.test(pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get('Authentication');
  const isPlatform = isPlatformHost(hostname);
  const tenantSubdomain = getTenantSubdomain(hostname);

  // If there's no auth cookie, redirect to login for any protected path
  if (!cookie && pathname !== '/login') {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing login page, allow it regardless of auth status
  // This prevents redirect loops during logout
  if (pathname === '/login') {
    return NextResponse.next();
  }

  if (cookie) {
    try {
      const payload = decodeJwt<JwtPayload>(cookie.value);

      // SCENARIO 1: Logged into a TENANT session.
      if (payload.tenantId) {
        // If they have a tenant token but try to access the PLATFORM domain, log them out.
        if (isPlatform) {
          console.log('Tenant session trying to access platform domain. Denying.');
          const loginUrl = new URL('/login', request.url);
          // By clearing the cookie and redirecting, we force a clean login.
          const response = NextResponse.redirect(loginUrl);
          response.cookies.delete('Authentication');
          return response;
        }
        
        // If user has tenant context, rewrite tenant routes to the tenant group
        if (pathname === '/' || pathname.startsWith('/page1') || pathname.startsWith('/page2') || pathname.startsWith('/admin')) {
          console.log(`[Middleware] Rewriting tenant route from ${pathname} to /(tenant)${pathname}`);
          const url = request.nextUrl.clone();
          url.pathname = `/(tenant)${pathname}`;
          return NextResponse.rewrite(url);
        }
        
        // Block access to platform routes from tenant subdomains
        if (pathname.startsWith('/platform')) {
          console.log(`[Middleware] Blocking platform route ${pathname} from tenant subdomain`);
          const url = request.nextUrl.clone();
          url.pathname = '/';
          return NextResponse.redirect(url);
        }
      } 
      // SCENARIO 2: Logged into a PLATFORM/MASTER session.
      else {
        // If they have a platform token and are NOT a super admin, block access to tenant domains.
        if (!isPlatform && !payload.isSuperAdmin) {
          console.log('Non-superadmin platform session trying to access tenant domain. Denying.');
          const loginUrl = new URL('/login', request.url);
          const response = NextResponse.redirect(loginUrl);
          response.cookies.delete('Authentication');
          return response;
        }
      }
      
    } catch (error) {
      // If token is invalid or expired, clear it and redirect to login
      console.error('Invalid token, redirecting to login:', error);
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('Authentication');
      return response;
    }
  }

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