import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 400 }
      );
    }

    console.log('🔐 Setting secure login cookie on tenant domain');
    
    // Create response and set the authentication cookie
    const response = NextResponse.json({ success: true });
    
    // Set the authentication cookie on this domain
    response.cookies.set('Authentication', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1 hour default
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error setting secure login cookie:', error);
    return NextResponse.json(
      { error: 'Failed to set authentication cookie' },
      { status: 500 }
    );
  }
} 