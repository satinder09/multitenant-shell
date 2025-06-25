// apps/frontend/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json({ message: 'API base URL is not configured' }, { status: 500 });
  }

  try {
    const originalHost = req.headers.get('host') || '';

    // Forward the request to the backend
    const backendRes = await fetch(`${backendUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-host': originalHost,
      },
      body: JSON.stringify(body),
    });
    
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
