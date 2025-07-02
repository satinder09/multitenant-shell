import { NextRequest, NextResponse } from 'next/server';
import { ServerApiClient } from '@/shared/services/api/server-client';

export async function GET(req: NextRequest) {
  try {
    const serverApi = new ServerApiClient();
    const response = await serverApi.get('/auth/csrf-token', { skipCSRF: true }, req);
    
    // Get the CSRF token from the backend response
    const csrfToken = response.headers.get('X-CSRF-Token');
    const data = await response.json();
    
    // Create the frontend response
    const nextResponse = NextResponse.json(data, { status: response.status });
    
    // Forward the CSRF token header to the client
    if (csrfToken) {
      nextResponse.headers.set('X-CSRF-Token', csrfToken);
    }
    
    return nextResponse;
  } catch (error) {
    console.error('CSRF token proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CSRF token' }, 
      { status: 500 }
    );
  }
} 