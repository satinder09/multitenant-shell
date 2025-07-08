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
    const verifyData = {
      ...body,
      ...(tenantSubdomain && { tenantSubdomain })
    };
    
    console.log('[API VERIFY-2FA PROXY] Request body:', body);
    console.log('[API VERIFY-2FA PROXY] Hostname:', hostname);
    console.log('[API VERIFY-2FA PROXY] Tenant subdomain:', tenantSubdomain);
    console.log('[API VERIFY-2FA PROXY] Final verify data:', verifyData);
    console.log('[API VERIFY-2FA PROXY] Backend URL being used:', process.env.NEXT_PUBLIC_BACKEND_URL || 'http://lvh.me:4000');
    
    // Use the generic server client with CSRF protection
    const serverApi = new ServerApiClient();
    const backendRes = await serverApi.post('/auth/verify-2fa-login', verifyData, {}, req);
    
    console.log('[API VERIFY-2FA PROXY] Backend response status:', backendRes.status);
    console.log('[API VERIFY-2FA PROXY] Backend response headers:', Object.fromEntries(backendRes.headers.entries()));
    
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
    console.error('[API VERIFY-2FA PROXY] Error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
} 