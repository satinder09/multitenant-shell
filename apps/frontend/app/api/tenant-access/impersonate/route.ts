import { NextRequest, NextResponse } from 'next/server';
import { ServerApiClient } from '@/shared/services/api/server-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Use server-side client with automatic CSRF protection
    const serverApi = new ServerApiClient();
    const response = await serverApi.post('/tenant-access/impersonate', body, {
      timeout: 10000
    }, request);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { 
          error: 'Failed to start impersonation',
          details: errorData
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error starting impersonation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 