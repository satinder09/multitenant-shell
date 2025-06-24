import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from 'jose';

interface JwtPayload {
  tenantId?: string;
  isSuperAdmin?: boolean;
}

// Function to get the root domain from the hostname
function getRootDomain(hostname: string): string {
  // Remove port if present
  const hostWithoutPort = hostname.split(':')[0];
  
  // Define known root domains
  const rootDomains = ['localhost', 'lvh.me', '127.0.0.1'];
  
  // Check if it's a root domain
  if (rootDomains.includes(hostWithoutPort)) {
    return hostWithoutPort;
  }
  
  // For subdomain cases like tenant1.localhost or tenant1.lvh.me
  const parts = hostWithoutPort.split('.');
  if (parts.length >= 2) {
    // Return the root domain (last two parts for most cases)
    return parts.slice(-2).join('.');
  }
  
  // Fallback
  return hostWithoutPort;
}

// Function to check if current hostname is a tenant domain
function checkIsTenantDomain(hostname: string): boolean {
  const hostWithoutPort = hostname.split(':')[0];
  const rootDomains = ['localhost', 'lvh.me', '127.0.0.1'];
  
  // If it's exactly a root domain, it's not a tenant domain
  if (rootDomains.includes(hostWithoutPort)) {
    return false;
  }
  
  // If it has a subdomain (e.g., tenant1.localhost), it's a tenant domain
  const parts = hostWithoutPort.split('.');
  return parts.length > 1;
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
  const isTenantDomain = checkIsTenantDomain(hostname);

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