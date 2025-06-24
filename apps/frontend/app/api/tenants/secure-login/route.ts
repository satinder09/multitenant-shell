import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${process.env.BACKEND_URL}/tenants/secure-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Secure login failed' },
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
    console.error('Error during secure login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 