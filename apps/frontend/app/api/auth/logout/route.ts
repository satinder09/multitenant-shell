import { NextRequest, NextResponse } from 'next/server';
import { serverPost } from '@/shared/services/api/server-client';

export async function POST(req: NextRequest) {
  try {
    const resp = await serverPost('/auth/logout', {}, {}, req);
    const body = await resp.json();
    const nextRes = NextResponse.json(body, { status: resp.status });

    // Clear any Set-Cookie header from the backend
    const setCookie = resp.headers.get('set-cookie');
    if (setCookie) nextRes.headers.set('set-cookie', setCookie);

    return nextRes;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' }, 
      { status: 500 }
    );
  }
}
