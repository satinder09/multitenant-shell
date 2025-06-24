import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/tenants/impersonate/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
    });

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