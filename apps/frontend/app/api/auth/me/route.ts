import { NextRequest, NextResponse } from 'next/server';
import { createServerApiClient } from '@/shared/services/api-client';
import { ApiClientError } from '@/shared/services/api-client';

export async function GET(req: NextRequest) {
  console.log(`Forwarding 'me' request to backend`);

  try {
    const serverClient = createServerApiClient(req);
    const response = await serverClient.get('/auth/me');

    if (!response.success) {
      return NextResponse.json(
        { message: `Error from backend: ${response.error}` },
        { status: 500 },
      );
    }

    return NextResponse.json(response.data);

  } catch (error) {
    console.error('Auth "me" proxy fetch failed:', error);
    
    // Handle authentication errors (401/403) differently from service errors
    if (error instanceof ApiClientError) {
      if (error.status === 401) {
        // User is not authenticated - this is normal, return 401
        return NextResponse.json(
          { message: 'Not authenticated' },
          { status: 401 }
        );
      } else if (error.status === 403) {
        // User is authenticated but not authorized - return 403
        return NextResponse.json(
          { message: 'Access forbidden' },
          { status: 403 }
        );
      } else if (error.status && error.status >= 400 && error.status < 500) {
        // Other client errors - return as-is
        return NextResponse.json(
          { message: error.message },
          { status: error.status }
        );
      }
    }
    
    // For all other errors (network issues, 500+ errors, etc.)
    return NextResponse.json(
      { message: 'Could not connect to the backend service.' },
      { status: 503 }, // 503 Service Unavailable is appropriate for actual service issues
    );
  }
}
