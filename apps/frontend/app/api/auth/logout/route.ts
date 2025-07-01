import { NextRequest, NextResponse } from 'next/server';
import { serverPost } from '@/shared/services/api/server-client';

export async function POST(req: NextRequest) {
  try {
    const resp = await serverPost('/auth/logout', {}, {}, req);
    const body = await resp.json();
    const nextRes = NextResponse.json(body, { status: resp.status });

    // Clear any Set-Cookie header from the backend first
    const setCookie = resp.headers.get('set-cookie');
    if (setCookie) nextRes.headers.set('set-cookie', setCookie);

    // Explicitly clear all authentication-related cookies
    const cookiesToClear = ['Authentication', 'auth-token', 'refresh-token', 'session', 'connect.sid'];
    
    cookiesToClear.forEach(cookieName => {
      nextRes.cookies.delete(cookieName);
      // Also clear for the main domain
      nextRes.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        domain: process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me'
      });
      // Clear for subdomain as well
      nextRes.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/'
      });
    });

    return nextRes;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if backend fails, clear cookies on frontend
    const nextRes = NextResponse.json(
      { error: 'Logout failed' }, 
      { status: 500 }
    );
    
    const cookiesToClear = ['Authentication', 'auth-token', 'refresh-token', 'session', 'connect.sid'];
    cookiesToClear.forEach(cookieName => {
      nextRes.cookies.delete(cookieName);
      nextRes.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        domain: process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me'  
      });
      nextRes.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/'
      });
    });
    
    return nextRes;
  }
}
