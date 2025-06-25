import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const originalHost = req.headers.get('host') || '';
  const cookie = req.headers.get('cookie') || '';

  const resp = await fetch(`${backendUrl}/auth/logout`, {
    method: 'POST',
    headers: {
      'x-forwarded-host': originalHost,
      'cookie': cookie,               // ← forward the client cookie
    },
  });

  const body = await resp.json();
  const nextRes = NextResponse.json(body, { status: resp.status });

  // Clear any Set-Cookie header from the backend
  const setCookie = resp.headers.get('set-cookie');
  if (setCookie) nextRes.headers.set('set-cookie', setCookie);

  return nextRes;
}
