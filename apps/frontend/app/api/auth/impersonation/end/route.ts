import { NextRequest, NextResponse } from 'next/server';
import { ServerApiClient } from '@/shared/services/api/server-client';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Forward the request to the backend
    const serverApi = new ServerApiClient();
    const response = await serverApi.post('/tenant-access/impersonate/end', { sessionId }, {}, request);

    if (response.status === 200) {
      const data = await response.json();
      
      // Clear all authentication cookies
      const nextResponse = NextResponse.json(data);
      
      const cookiesToClear = ['Authentication', 'auth-token', 'refresh-token', 'session', 'connect.sid'];
      
      cookiesToClear.forEach(cookieName => {
        nextResponse.cookies.delete(cookieName);
        // Also clear for the main domain
        nextResponse.cookies.set(cookieName, '', {
          expires: new Date(0),
          path: '/',
          domain: process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me'
        });
        // Clear for subdomain as well
        nextResponse.cookies.set(cookieName, '', {
          expires: new Date(0),
          path: '/'
        });
      });
      
      return nextResponse;
    } else {
      return NextResponse.json(
        { error: 'Failed to end impersonation' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Error ending impersonation:', error);
    
    // Even if backend fails, clear cookies on frontend
    const nextResponse = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    
    const cookiesToClear = ['Authentication', 'auth-token', 'refresh-token', 'session', 'connect.sid'];
    cookiesToClear.forEach(cookieName => {
      nextResponse.cookies.delete(cookieName);
      nextResponse.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        domain: process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me'
      });
      nextResponse.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/'
      });
    });
    
    return nextResponse;
  }
} 