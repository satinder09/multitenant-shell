import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from 'jose';

interface JwtPayload {
  tenantId?: string;
  isSuperAdmin?: boolean;
}

// Function to get the root domain from the hostname
function getRootDomain(hostname: string): string {
  if (hostname.includes('localhost')) {
    return 'localhost';
  }
  // This can be made more robust for production domains
  return hostname.split('.').slice(-2).join('.');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host')!;

  // Allow requests for static files and API routes to pass through
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/static') || /\..*$/.test(pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get('Authentication');
  const rootDomain = getRootDomain(hostname);
  const isTenantDomain = hostname !== `${rootDomain}:3000` && hostname !== rootDomain;

  // If there's no auth cookie, redirect to login for any protected path
  if (!cookie && pathname !== '/login') {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (cookie) {
    try {
      const payload = decodeJwt<JwtPayload>(cookie.value);

      // SCENARIO 1: Logged into a TENANT session.
      if (payload.tenantId) {
        // If they have a tenant token but try to access the MASTER domain, log them out.
        if (!isTenantDomain) {
          console.log('Tenant session trying to access master domain. Denying.');
          const loginUrl = new URL('/login', request.url);
          // By clearing the cookie and redirecting, we force a clean login.
          const response = NextResponse.redirect(loginUrl);
          response.cookies.delete('Authentication');
          return response;
        }
      } 
      // SCENARIO 2: Logged into a MASTER session.
      else {
        // If they have a master token and are NOT a super admin, block access to tenant domains.
        if (isTenantDomain && !payload.isSuperAdmin) {
          console.log('Non-superadmin master session trying to access tenant domain. Denying.');
          const loginUrl = new URL('/login', request.url);
          const response = NextResponse.redirect(loginUrl);
          response.cookies.delete('Authentication');
          return response;
        }
      }

      // If already on the login page with a valid cookie, redirect to dashboard
      if (pathname === '/login') {
        const dashboardUrl = new URL('/', request.url);
        return NextResponse.redirect(dashboardUrl);
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