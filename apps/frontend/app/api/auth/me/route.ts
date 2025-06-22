import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  // CRITICAL: If the backend URL isn't set, we must not proceed.
  // This prevents an infinite loop where the proxy calls itself.
  if (!backendUrl) {
    console.error('FATAL: NEXT_PUBLIC_API_BASE_URL is not set. Halting proxy request.');
    return NextResponse.json(
      { message: 'Server configuration error.' },
      { status: 500 },
    );
  }
  
  const apiUrl = `${backendUrl}/auth/me`;
  console.log(`Forwarding 'me' request to: ${apiUrl}`);

  try {
    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        // Forward the cookie from the original client request
        'cookie': req.headers.get('cookie') || '',
      },
    });

    // If the backend responds with an error, proxy that response
    if (!resp.ok) {
      return NextResponse.json(
        { message: `Error from backend: ${resp.statusText}` },
        { status: resp.status },
      );
    }

    const data = await resp.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Auth "me" proxy fetch failed:', error);
    return NextResponse.json(
      { message: 'Could not connect to the backend service.' },
      { status: 503 }, // 503 Service Unavailable is more appropriate
    );
  }
}
