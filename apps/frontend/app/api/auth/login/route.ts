// apps/frontend/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverPost } from '@/shared/services/api/server-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Use the generic server client with CSRF protection
    const backendRes = await serverPost('/auth/login', body, {}, req);
    
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
