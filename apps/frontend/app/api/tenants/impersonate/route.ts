import { NextRequest, NextResponse } from 'next/server';
import { ServerApiClient } from '@/shared/services/api/server-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Use server-side client with automatic CSRF protection
    const serverApi = new ServerApiClient();
    const response = await serverApi.post('/tenants/impersonate', body, {
      timeout: 10000
    }, request);

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Impersonation failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Set the authentication cookie from the backend response
    const responseHeaders = new Headers();
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      responseHeaders.set('Set-Cookie', setCookieHeader);
    }

    return NextResponse.json(data, { headers: responseHeaders });
  } catch (error) {
    console.error('Error during impersonation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 