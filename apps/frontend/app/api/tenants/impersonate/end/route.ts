import { NextRequest, NextResponse } from 'next/server';
import { serverPost } from '@/shared/services/api/server-client';

export async function POST(request: NextRequest) {
  try {
    // Use server-side client with automatic CSRF protection
    const response = await serverPost('/tenants/impersonate/end', {}, {
      timeout: 10000
    }, request);

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to end impersonation' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Clear the authentication cookie
    const responseHeaders = new Headers();
    responseHeaders.set('Set-Cookie', 'Authentication=; Path=/; HttpOnly; Max-Age=0');

    return NextResponse.json(data, { headers: responseHeaders });
  } catch (error) {
    console.error('Error ending impersonation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 