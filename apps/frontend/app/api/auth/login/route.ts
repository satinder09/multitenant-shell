// apps/frontend/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ServerApiClient } from '@/shared/services/api/server-client';
import { getTenantSubdomain } from '@/shared/utils/contextUtils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const hostname = req.headers.get('host') || '';
    
    // Determine tenant context from subdomain
    const tenantSubdomain = getTenantSubdomain(hostname);
    
    // Add tenant context to the request body if we're on a tenant subdomain
    const loginData = {
      ...body,
      ...(tenantSubdomain && { tenantSubdomain })
    };
    
    console.log('[API LOGIN PROXY] Request body:', body);
    console.log('[API LOGIN PROXY] Hostname:', hostname);
    console.log('[API LOGIN PROXY] Tenant subdomain:', tenantSubdomain);
    console.log('[API LOGIN PROXY] Final login data:', loginData);
    console.log('[API LOGIN PROXY] Backend URL being used:', process.env.NEXT_PUBLIC_BACKEND_URL || 'http://lvh.me:4000');
    
    // Use the generic server client with CSRF protection
    const serverApi = new ServerApiClient();
    const backendRes = await serverApi.post('/auth/login', loginData, {}, req);
    
    console.log('[API LOGIN PROXY] Backend response status:', backendRes.status);
    console.log('[API LOGIN PROXY] Backend response headers:', Object.fromEntries(backendRes.headers.entries()));
    
    // Create a new response to send back to the client
    const clientRes = new NextResponse(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: backendRes.headers,
    });

    // Ensure cookies from the backend are passed to the client
    const setCookieHeader = backendRes.headers.get('set-cookie');
    if (setCookieHeader) {
      clientRes.headers.set('set-cookie', setCookieHeader);
    }

    return clientRes;

  } catch (error) {
    console.error('[API LOGIN PROXY] Error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
