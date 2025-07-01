import { NextRequest, NextResponse } from 'next/server';
import { serverPost } from '@/shared/services/api/server-client';

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
    const response = await serverPost('/tenant-access/impersonate/end', { sessionId }, {}, request);

    if (response.status === 200) {
      const data = await response.json();
      
      // Clear the authentication cookie
      const nextResponse = NextResponse.json(data);
      nextResponse.cookies.delete('Authentication');
      
      return nextResponse;
    } else {
      return NextResponse.json(
        { error: 'Failed to end impersonation' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Error ending impersonation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 