import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    console.log('🧹 Clearing all authentication cookies and session data');
    
    const response = NextResponse.json({ success: true, message: 'Session cleared' });
    
    // List of all possible authentication cookies
    const cookiesToClear = [
      'Authentication', 
      'auth-token', 
      'refresh-token', 
      'session', 
      'connect.sid',
      'next-auth.session-token',
      'next-auth.csrf-token',
      '__session',
      'token'
    ];
    
    // Clear cookies for both current domain and base domain
    cookiesToClear.forEach(cookieName => {
      // Delete cookie normally
      response.cookies.delete(cookieName);
      
      // Set expired cookie for current domain
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      // Set expired cookie for base domain (if different)
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me';
      if (baseDomain) {
        response.cookies.set(cookieName, '', {
          expires: new Date(0),
          path: '/',
          domain: `.${baseDomain}`,  // Include subdomain with dot prefix
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
        
        // Also clear without dot prefix
        response.cookies.set(cookieName, '', {
          expires: new Date(0),
          path: '/',
          domain: baseDomain,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }
    });
    
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    console.log('🧹 Session cleared successfully');
    return response;
    
  } catch (error) {
    console.error('Error clearing session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear session' },
      { status: 500 }
    );
  }
} 